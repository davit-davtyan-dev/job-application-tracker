import { EventEmitter } from "node:events";
import type { IncomingMessage, RequestOptions } from "node:http";
import { Readable } from "node:stream";

import { beforeEach, describe, expect, it, vi } from "vitest";

const { httpRequest, httpsRequest, lookup } = vi.hoisted(() => ({
  httpRequest: vi.fn(),
  httpsRequest: vi.fn(),
  lookup: vi.fn(),
}));
vi.mock("node:dns/promises", () => ({ default: { lookup }, lookup }));
vi.mock("node:http", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:http")>();
  return {
    ...original,
    default: { ...original, request: httpRequest },
    request: httpRequest,
  };
});
vi.mock("node:https", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:https")>();
  return {
    ...original,
    default: { ...original, request: httpsRequest },
    request: httpsRequest,
  };
});

import {
  extractJobPosting,
  JobPostingExtractionError,
} from "./job-posting-extraction";

interface FakeResponse {
  body?: string;
  headers?: Record<string, string>;
  status?: number;
}

function queueResponses(...responses: FakeResponse[]) {
  const requestMock = vi.fn(
    (
      _url: URL,
      options: RequestOptions,
      callback: (response: IncomingMessage) => void,
    ) => {
      const outgoing = new EventEmitter() as EventEmitter & {
        destroy: (error?: Error) => void;
        end: () => void;
        setTimeout: (timeout: number, listener: () => void) => void;
      };
      outgoing.destroy = (error) => {
        if (error) outgoing.emit("error", error);
      };
      outgoing.setTimeout = vi.fn();
      outgoing.end = () => {
        const next = responses.shift();
        if (!next) return outgoing.emit("error", new Error("No response"));
        const response = Readable.from([next.body ?? ""]) as IncomingMessage;
        Object.assign(response, {
          headers: {
            "content-type": "text/html; charset=utf-8",
            ...next.headers,
          },
          statusCode: next.status ?? 200,
        });
        callback(response);
      };
      return outgoing;
    },
  );
  httpsRequest.mockImplementation(requestMock);
  httpRequest.mockImplementation(requestMock);
  return requestMock;
}

describe("extractJobPosting", () => {
  beforeEach(() => {
    lookup
      .mockReset()
      .mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    httpRequest.mockReset();
    httpsRequest.mockReset();
  });

  it("prefers JobPosting JSON-LD in graph/array forms and normalizes HTML", async () => {
    queueResponses({
      body: `
          <meta property="og:title" content="Fallback title">
          <script type="application/ld+json">[
            {"@context":"https://schema.org","@graph":[
              {"@type":["Thing","JobPosting"],"title":" Senior &amp; Staff Engineer ",
               "hiringOrganization":{"name":"Acme &amp; Co"},
               "description":"<p>Build things</p><ul><li>Ship &amp; learn</li></ul>"}
            ]}
          ]</script>
        `,
    });

    await expect(
      extractJobPosting({ url: "https://jobs.example.com/posting" }),
    ).resolves.toEqual({
      sourceUrl: "https://jobs.example.com/posting",
      companyName: "Acme & Co",
      positionTitle: "Senior & Staff Engineer",
      description: "Build things\nShip & learn",
    });
  });

  it("falls back per missing field to metadata and focused semantic HTML", async () => {
    queueResponses({
      body: `
          <script type="application/ld+json">{"@type":"https://schema.org/JobPosting","title":"Designer"}</script>
          <meta property='og:site_name' content='Example &amp; Sons'>
          <main><p>Design&nbsp;accessible products.</p></main>
        `,
    });

    await expect(
      extractJobPosting({ url: "https://example.com/job" }),
    ).resolves.toMatchObject({
      companyName: "Example & Sons",
      positionTitle: "Designer",
      description: "Design accessible products.",
    });
  });

  it("returns partial data and rejects pages with no extractable details", async () => {
    queueResponses(
      { body: "<h1>Only a title</h1>" },
      { body: "<html><body></body></html>" },
    );

    await expect(
      extractJobPosting({ url: "https://example.com/one" }),
    ).resolves.toMatchObject({
      companyName: null,
      positionTitle: "Only a title",
      description: null,
    });
    await expect(
      extractJobPosting({ url: "https://example.com/two" }),
    ).rejects.toMatchObject({ code: "NOTHING_EXTRACTED" });
  });

  it("rejects credentials, localhost, private, reserved, and mixed DNS results", async () => {
    const requestMock = queueResponses();
    await expect(
      extractJobPosting({ url: "https://user:secret@example.com/job" }),
    ).rejects.toMatchObject({ code: "UNSAFE_DESTINATION" });
    await expect(
      extractJobPosting({ url: "http://localhost/job" }),
    ).rejects.toMatchObject({ code: "UNSAFE_DESTINATION" });
    lookup.mockResolvedValue([
      { address: "93.184.216.34", family: 4 },
      { address: "10.0.0.2", family: 4 },
    ]);
    await expect(
      extractJobPosting({ url: "https://example.com/job" }),
    ).rejects.toMatchObject({ code: "UNSAFE_DESTINATION" });
    expect(requestMock).not.toHaveBeenCalled();
  });

  it("rejects direct and resolved special-purpose ranges exhaustively", async () => {
    const requestMock = queueResponses();
    await expect(
      extractJobPosting({ url: "https://192.0.2.1/job" }),
    ).rejects.toMatchObject({ code: "UNSAFE_DESTINATION" });
    for (const address of [
      "0.1.2.3",
      "192.88.99.1",
      "240.0.0.1",
      "100::1",
      "2001:db8::1",
      "fc00::1",
      "fe80::1",
      "ff02::1",
    ]) {
      lookup.mockResolvedValueOnce([
        { address, family: address.includes(":") ? 6 : 4 },
      ]);
      await expect(
        extractJobPosting({ url: "https://example.com/job" }),
      ).rejects.toMatchObject({ code: "UNSAFE_DESTINATION" });
    }
    expect(requestMock).not.toHaveBeenCalled();
  });

  it("revalidates DNS for redirect hops and rejects a private redirect", async () => {
    lookup
      .mockResolvedValueOnce([{ address: "93.184.216.34", family: 4 }])
      .mockResolvedValueOnce([{ address: "169.254.1.1", family: 4 }]);
    const requestMock = queueResponses({
      status: 302,
      headers: { location: "http://internal.example/admin" },
    });

    await expect(
      extractJobPosting({ url: "https://example.com/job" }),
    ).rejects.toMatchObject({ code: "UNSAFE_DESTINATION" });
    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(lookup).toHaveBeenCalledTimes(2);
  });

  it("limits redirects", async () => {
    const requestMock = queueResponses(
      ...Array.from({ length: 5 }, () => ({
        status: 302,
        headers: { location: "/again" },
      })),
    );
    await expect(
      extractJobPosting({ url: "https://example.com/job" }),
    ).rejects.toMatchObject({ code: "TOO_MANY_REDIRECTS" });
    expect(requestMock).toHaveBeenCalledTimes(5);
  });

  it("pins the connection lookup to the address validated for that hop", async () => {
    lookup.mockResolvedValue([
      { address: "93.184.216.34", family: 4 },
      { address: "2606:2800:220:1:248:1893:25c8:1946", family: 6 },
    ]);
    const requestMock = queueResponses({ body: "<h1>Engineer</h1>" });
    await extractJobPosting({ url: "https://example.com/job" });

    const options = requestMock.mock.calls[0]?.[1];
    const connectionLookup = options?.lookup;
    expect(connectionLookup).toBeTypeOf("function");
    const callback = vi.fn();
    connectionLookup?.("example.com", { all: false }, callback);
    expect(callback).toHaveBeenCalledWith(null, "93.184.216.34", 4);
    expect(lookup).toHaveBeenCalledTimes(1);
  });

  it("rejects non-HTML and oversized responses", async () => {
    queueResponses(
      { body: "pdf", headers: { "content-type": "application/pdf" } },
      { body: "small", headers: { "content-length": "1000001" } },
    );
    await expect(
      extractJobPosting({ url: "https://example.com/file" }),
    ).rejects.toMatchObject({ code: "UNSUPPORTED_CONTENT" });
    await expect(
      extractJobPosting({ url: "https://example.com/large" }),
    ).rejects.toMatchObject({ code: "RESPONSE_TOO_LARGE" });
  });

  it("maps timeout and network failures without leaking their details", async () => {
    const timeoutRequest = queueResponses();
    timeoutRequest.mockImplementationOnce(() => {
      const outgoing = new EventEmitter() as EventEmitter & {
        destroy: (error?: Error) => void;
        end: () => void;
        setTimeout: (timeout: number, listener: () => void) => void;
      };
      outgoing.destroy = (error) => error && outgoing.emit("error", error);
      outgoing.setTimeout = (_timeout, listener) => listener();
      outgoing.end = vi.fn();
      return outgoing;
    });
    const timeout = extractJobPosting({ url: "https://example.com/slow" });
    await expect(timeout).rejects.toEqual(
      new JobPostingExtractionError(
        "FETCH_TIMEOUT",
        "The job posting took too long to respond.",
      ),
    );
    const networkRequest = queueResponses();
    networkRequest.mockImplementationOnce(() => {
      const outgoing = new EventEmitter() as EventEmitter & {
        destroy: () => void;
        end: () => void;
        setTimeout: () => void;
      };
      outgoing.destroy = vi.fn();
      outgoing.setTimeout = vi.fn();
      outgoing.end = () => outgoing.emit("error", new Error("secret"));
      return outgoing;
    });
    await expect(
      extractJobPosting({ url: "https://example.com/down" }),
    ).rejects.toMatchObject({
      code: "FETCH_FAILED",
      message: "The job posting could not be fetched.",
    });
  });
});
