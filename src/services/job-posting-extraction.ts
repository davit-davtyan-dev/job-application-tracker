import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { z } from "zod";

const MAX_REDIRECTS = 4;
const MAX_BYTES = 1_000_000;
const MAX_TEXT_LENGTH = 20_000;
const REQUEST_TIMEOUT_MS = 8_000;

export const jobPostingExtractionInputSchema = z.strictObject({
  url: z
    .url("Enter a valid job-posting URL.")
    .refine(isHttpUrl, "Only HTTP(S) job-posting URLs are supported."),
});

export const jobPostingExtractionResultSchema = z.strictObject({
  sourceUrl: z.url(),
  companyName: z.string().max(500).nullable(),
  positionTitle: z.string().max(500).nullable(),
  description: z.string().max(MAX_TEXT_LENGTH).nullable(),
});

export type JobPostingExtractionResult = z.infer<
  typeof jobPostingExtractionResultSchema
>;

export type JobPostingExtractionErrorCode =
  | "UNSAFE_DESTINATION"
  | "UNSUPPORTED_CONTENT"
  | "RESPONSE_TOO_LARGE"
  | "FETCH_TIMEOUT"
  | "FETCH_FAILED"
  | "TOO_MANY_REDIRECTS"
  | "NOTHING_EXTRACTED";

export class JobPostingExtractionError extends Error {
  constructor(
    readonly code: JobPostingExtractionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "JobPostingExtractionError";
  }
}

type JsonObject = Record<string, unknown>;

export async function extractJobPosting(
  input: unknown,
): Promise<JobPostingExtractionResult> {
  const { url } = jobPostingExtractionInputSchema.parse(input);
  const sourceUrl = new URL(url);
  validateUrlShape(sourceUrl);
  const html = await fetchHtml(sourceUrl);
  const extracted = extractFromHtml(html);
  if (
    !extracted.companyName &&
    !extracted.positionTitle &&
    !extracted.description
  ) {
    throw new JobPostingExtractionError(
      "NOTHING_EXTRACTED",
      "No job-posting details could be extracted from this page.",
    );
  }
  return jobPostingExtractionResultSchema.parse({
    sourceUrl: sourceUrl.href,
    ...extracted,
  });
}

async function fetchHtml(initialUrl: URL): Promise<string> {
  let currentUrl = initialUrl;
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    validateUrlShape(currentUrl);
    await assertPublicDestination(currentUrl.hostname);
    let response: Response;
    try {
      response = await fetch(currentUrl, {
        redirect: "manual",
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: {
          accept: "text/html,application/xhtml+xml",
          "user-agent": "JobApplicationTracker/1.0",
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof DOMException &&
        (error.name === "TimeoutError" || error.name === "AbortError")
      ) {
        throw new JobPostingExtractionError(
          "FETCH_TIMEOUT",
          "The job posting took too long to respond.",
        );
      }
      throw new JobPostingExtractionError(
        "FETCH_FAILED",
        "The job posting could not be fetched.",
      );
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new JobPostingExtractionError(
          "FETCH_FAILED",
          "The job posting returned an invalid redirect.",
        );
      }
      if (redirects === MAX_REDIRECTS) {
        throw new JobPostingExtractionError(
          "TOO_MANY_REDIRECTS",
          "The job posting redirected too many times.",
        );
      }
      currentUrl = new URL(location, currentUrl);
      continue;
    }

    if (!response.ok) {
      throw new JobPostingExtractionError(
        "FETCH_FAILED",
        "The job posting could not be fetched.",
      );
    }
    const contentType = response.headers.get("content-type")?.toLowerCase();
    if (
      !contentType ||
      (!contentType.includes("text/html") &&
        !contentType.includes("application/xhtml+xml"))
    ) {
      throw new JobPostingExtractionError(
        "UNSUPPORTED_CONTENT",
        "The URL must return an HTML page.",
      );
    }
    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_BYTES) {
      throw new JobPostingExtractionError(
        "RESPONSE_TOO_LARGE",
        "The job posting page is too large to import safely.",
      );
    }
    return readBoundedText(response);
  }
  throw new JobPostingExtractionError(
    "TOO_MANY_REDIRECTS",
    "The job posting redirected too many times.",
  );
}

async function readBoundedText(response: Response): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel();
      throw new JobPostingExtractionError(
        "RESPONSE_TOO_LARGE",
        "The job posting page is too large to import safely.",
      );
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

function validateUrlShape(url: URL) {
  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.username ||
    url.password
  ) {
    throw new JobPostingExtractionError(
      "UNSAFE_DESTINATION",
      "The URL must be a public HTTP(S) address without credentials.",
    );
  }
}

async function assertPublicDestination(hostname: string) {
  const normalized = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (normalized === "localhost" || normalized.endsWith(".localhost")) {
    throw unsafeDestination();
  }
  const addresses = isIP(normalized)
    ? [{ address: normalized }]
    : await lookup(normalized, { all: true, verbatim: true }).catch(() => {
        throw new JobPostingExtractionError(
          "FETCH_FAILED",
          "The job posting address could not be resolved.",
        );
      });
  if (
    addresses.length === 0 ||
    addresses.some(({ address }) => !isPublicIp(address))
  ) {
    throw unsafeDestination();
  }
}

function unsafeDestination() {
  return new JobPostingExtractionError(
    "UNSAFE_DESTINATION",
    "The URL must resolve only to public internet addresses.",
  );
}

function isPublicIp(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const [a, b, c] = address.split(".").map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 88 && c === 99) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51 && c === 100) ||
      (a === 203 && b === 0 && c === 113) ||
      a >= 224
    );
  }
  if (version === 6) {
    const value = address.toLowerCase();
    if (value.startsWith("::ffff:")) return isPublicIp(value.slice(7));
    return !(
      value === "::" ||
      value === "::1" ||
      value.startsWith("100:") ||
      value.startsWith("fc") ||
      value.startsWith("fd") ||
      /^fe[89ab]/.test(value) ||
      value.startsWith("ff") ||
      value.startsWith("2001:db8:")
    );
  }
  return false;
}

function extractFromHtml(html: string) {
  const posting = findJobPosting(html);
  const positionTitle =
    normalizedValue(posting?.title) ??
    firstMeta(html, ["og:title", "twitter:title"]) ??
    focusedText(html, ["h1"]);
  const companyName =
    normalizedValue(objectValue(posting?.hiringOrganization)?.name) ??
    firstMeta(html, ["og:site_name", "application-name"]) ??
    focusedText(html, ["[itemprop=hiringOrganization]", "[itemprop=name]"]);
  const description =
    normalizedDescription(posting?.description) ??
    firstMeta(
      html,
      ["og:description", "twitter:description", "description"],
      true,
    ) ??
    focusedText(html, ["[itemprop=description]", "article", "main"]);
  return { companyName, positionTitle, description };
}

function findJobPosting(html: string): JsonObject | undefined {
  const pattern =
    /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi;
  for (const match of html.matchAll(pattern)) {
    try {
      const parsed: unknown = JSON.parse(match[1].trim());
      const found = walkJsonLd(parsed).find((item) =>
        hasJobPostingType(item["@type"]),
      );
      if (found) return found;
    } catch {
      // Invalid JSON-LD is ignored so generic HTML fallbacks remain available.
    }
  }
}

function walkJsonLd(value: unknown): JsonObject[] {
  if (Array.isArray(value)) return value.flatMap(walkJsonLd);
  if (!isObject(value)) return [];
  const graph = value["@graph"];
  return [value, ...(graph === undefined ? [] : walkJsonLd(graph))];
}

function hasJobPostingType(value: unknown) {
  const types = Array.isArray(value) ? value : [value];
  return types.some(
    (type) =>
      typeof type === "string" &&
      type.toLowerCase().replace(/^https?:\/\/schema\.org\//, "") ===
        "jobposting",
  );
}

function firstMeta(html: string, names: string[], description = false) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const name of names) {
    for (const tag of tags) {
      const attributes = parseAttributes(tag);
      const key = (attributes.property ?? attributes.name)?.toLowerCase();
      if (key === name) {
        const value = description
          ? normalizedDescription(attributes.content)
          : normalizedValue(attributes.content);
        if (value) return value;
      }
    }
  }
  return null;
}

function focusedText(html: string, selectors: string[]) {
  for (const selector of selectors) {
    const pattern =
      selector === "h1" || selector === "article" || selector === "main"
        ? new RegExp(
            `<${selector}\\b[^>]*>([\\s\\S]*?)<\\/${selector}\\s*>`,
            "i",
          )
        : new RegExp(
            `<([a-z][\\w:-]*)\\b[^>]*${selector.slice(1, -1).replace("=", "\\s*=\\s*[\\\"']?")}[^>]*>([\\s\\S]*?)<\\/\\1\\s*>`,
            "i",
          );
    const match = html.match(pattern);
    const value = normalizedDescription(match?.[match.length - 1]);
    if (value) return value;
  }
  return null;
}

function parseAttributes(tag: string) {
  const attributes: Record<string, string> = {};
  for (const match of tag.matchAll(
    /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g,
  )) {
    attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return attributes;
}

function normalizedValue(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const result = decodeEntities(value).replace(/\s+/g, " ").trim();
  return result ? result.slice(0, 500) : null;
}

function normalizedDescription(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|section|article)>/gi, "\n")
    .replace(/<[^>]*>/g, " ");
  const result = decodeEntities(text)
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return result ? result.slice(0, MAX_TEXT_LENGTH) : null;
}

function decodeEntities(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };
  return value.replace(
    /&(#x[\da-f]+|#\d+|[a-z]+);/gi,
    (entity, code: string) => {
      if (code.startsWith("#x"))
        return safeCodePoint(Number.parseInt(code.slice(2), 16), entity);
      if (code.startsWith("#"))
        return safeCodePoint(Number.parseInt(code.slice(1), 10), entity);
      return named[code.toLowerCase()] ?? entity;
    },
  );
}

function safeCodePoint(code: number, fallback: string) {
  try {
    return String.fromCodePoint(code);
  } catch {
    return fallback;
  }
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function objectValue(value: unknown): JsonObject | undefined {
  return isObject(value) ? value : undefined;
}

function isHttpUrl(value: string): boolean {
  if (!URL.canParse(value)) return false;
  const protocol = new URL(value).protocol;
  return protocol === "http:" || protocol === "https:";
}
