import "server-only";

import { lookup } from "node:dns/promises";
import { request as httpRequest, type IncomingMessage } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP, type LookupFunction } from "node:net";

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
type ValidatedAddress = { address: string; family: 4 | 6 };

const blockedIpv4Cidrs = [
  "0.0.0.0/8",
  "10.0.0.0/8",
  "100.64.0.0/10",
  "127.0.0.0/8",
  "169.254.0.0/16",
  "172.16.0.0/12",
  "192.0.0.0/24",
  "192.0.2.0/24",
  "192.31.196.0/24",
  "192.52.193.0/24",
  "192.88.99.0/24",
  "192.168.0.0/16",
  "192.175.48.0/24",
  "198.18.0.0/15",
  "198.51.100.0/24",
  "203.0.113.0/24",
  "224.0.0.0/4",
  "240.0.0.0/4",
] as const;

const blockedIpv6Cidrs = [
  "::/128",
  "::1/128",
  "::ffff:0:0/96",
  "64:ff9b::/96",
  "64:ff9b:1::/48",
  "100::/64",
  "2001::/23",
  "2001:db8::/32",
  "2002::/16",
  "3fff::/20",
  "5f00::/16",
  "fc00::/7",
  "fe80::/10",
  "ff00::/8",
] as const;

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
    const addresses = await resolvePublicDestination(currentUrl.hostname);
    let response: IncomingMessage;
    try {
      response = await requestPinned(currentUrl, addresses);
    } catch (error: unknown) {
      if (error instanceof RequestTimeoutError) {
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

    const status = response.statusCode ?? 0;
    if (status >= 300 && status < 400) {
      response.resume();
      const location = response.headers.location;
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

    if (status < 200 || status >= 300) {
      response.resume();
      throw new JobPostingExtractionError(
        "FETCH_FAILED",
        "The job posting could not be fetched.",
      );
    }
    const contentType = response.headers["content-type"]?.toLowerCase();
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
    const contentLength = Number(response.headers["content-length"]);
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

async function readBoundedText(response: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const value of response) {
    const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value);
    size += chunk.byteLength;
    if (size > MAX_BYTES) {
      response.destroy();
      throw new JobPostingExtractionError(
        "RESPONSE_TOO_LARGE",
        "The job posting page is too large to import safely.",
      );
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, size).toString("utf8");
}

class RequestTimeoutError extends Error {}

function requestPinned(
  url: URL,
  addresses: readonly ValidatedAddress[],
): Promise<IncomingMessage> {
  const selected = addresses[0];
  const pinnedLookup: LookupFunction = (_hostname, options, callback) => {
    if (options.all) {
      callback(null, [{ address: selected.address, family: selected.family }]);
    } else {
      callback(null, selected.address, selected.family);
    }
  };
  const request = url.protocol === "https:" ? httpsRequest : httpRequest;
  return new Promise((resolve, reject) => {
    const outgoing = request(
      url,
      {
        agent: false,
        headers: {
          accept: "text/html,application/xhtml+xml",
          "user-agent": "JobApplicationTracker/1.0",
        },
        lookup: pinnedLookup,
        servername: url.hostname,
      },
      resolve,
    );
    outgoing.once("error", reject);
    outgoing.setTimeout(REQUEST_TIMEOUT_MS, () => {
      outgoing.destroy(new RequestTimeoutError());
    });
    outgoing.end();
  });
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

async function resolvePublicDestination(
  hostname: string,
): Promise<ValidatedAddress[]> {
  const normalized = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (normalized === "localhost" || normalized.endsWith(".localhost")) {
    throw unsafeDestination();
  }
  const literalFamily = isIP(normalized);
  const addresses = literalFamily
    ? [{ address: normalized, family: literalFamily }]
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
  return addresses.map(({ address, family }) => ({
    address,
    family: family === 6 ? 6 : 4,
  }));
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
    return !blockedIpv4Cidrs.some((cidr) => addressInCidr(address, cidr, 32));
  }
  if (version === 6) {
    return !blockedIpv6Cidrs.some((cidr) => addressInCidr(address, cidr, 128));
  }
  return false;
}

function addressInCidr(address: string, cidr: string, bits: 32 | 128) {
  const [base, prefixText] = cidr.split("/");
  const prefix = Number(prefixText);
  const shift = BigInt(bits - prefix);
  return ipToBigInt(address) >> shift === ipToBigInt(base) >> shift;
}

function ipToBigInt(address: string): bigint {
  if (isIP(address) === 4) {
    return address
      .split(".")
      .reduce(
        (result, octet) => (result << BigInt(8)) | BigInt(octet),
        BigInt(0),
      );
  }
  let value = address.toLowerCase();
  const ipv4 = value.match(/(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  if (ipv4) {
    const encoded = ipToBigInt(ipv4);
    value = value.replace(
      ipv4,
      `${((encoded >> BigInt(16)) & BigInt(0xffff)).toString(16)}:${(encoded & BigInt(0xffff)).toString(16)}`,
    );
  }
  const [left = "", right = ""] = value.split("::");
  const leftParts = left ? left.split(":") : [];
  const rightParts = right ? right.split(":") : [];
  const zeros = Array.from(
    { length: Math.max(0, 8 - leftParts.length - rightParts.length) },
    () => "0",
  );
  return [...leftParts, ...zeros, ...rightParts].reduce(
    (result, part) => (result << BigInt(16)) | BigInt(`0x${part || "0"}`),
    BigInt(0),
  );
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
