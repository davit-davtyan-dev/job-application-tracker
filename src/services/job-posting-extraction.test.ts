import { beforeEach, describe, expect, it, vi } from "vitest";

const { lookup } = vi.hoisted(() => ({ lookup: vi.fn() }));
vi.mock("node:dns/promises", () => ({ default: { lookup }, lookup }));

import {
  extractJobPosting,
  JobPostingExtractionError,
} from "./job-posting-extraction";

const htmlResponse = (html: string, init?: ResponseInit) =>
  new Response(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
    ...init,
  });

describe("extractJobPosting", () => {
  beforeEach(() => {
    lookup
      .mockReset()
      .mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    vi.unstubAllGlobals();
  });

  it("prefers JobPosting JSON-LD in graph/array forms and normalizes HTML", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        htmlResponse(`
          <meta property="og:title" content="Fallback title">
          <script type="application/ld+json">[
            {"@context":"https://schema.org","@graph":[
              {"@type":["Thing","JobPosting"],"title":" Senior &amp; Staff Engineer ",
               "hiringOrganization":{"name":"Acme &amp; Co"},
               "description":"<p>Build things</p><ul><li>Ship &amp; learn</li></ul>"}
            ]}
          ]</script>
        `),
      ),
    );

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
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        htmlResponse(`
          <script type="application/ld+json">{"@type":"https://schema.org/JobPosting","title":"Designer"}</script>
          <meta property='og:site_name' content='Example &amp; Sons'>
          <main><p>Design&nbsp;accessible products.</p></main>
        `),
      ),
    );

    await expect(
      extractJobPosting({ url: "https://example.com/job" }),
    ).resolves.toMatchObject({
      companyName: "Example & Sons",
      positionTitle: "Designer",
      description: "Design accessible products.",
    });
  });

  it("returns partial data and rejects pages with no extractable details", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(htmlResponse("<h1>Only a title</h1>"))
      .mockResolvedValueOnce(htmlResponse("<html><body></body></html>"));
    vi.stubGlobal("fetch", fetchMock);

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
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
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
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("revalidates DNS for redirect hops and rejects a private redirect", async () => {
    lookup
      .mockResolvedValueOnce([{ address: "93.184.216.34", family: 4 }])
      .mockResolvedValueOnce([{ address: "169.254.1.1", family: 4 }]);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(null, {
          status: 302,
          headers: { location: "http://internal.example/admin" },
        }),
      ),
    );

    await expect(
      extractJobPosting({ url: "https://example.com/job" }),
    ).rejects.toMatchObject({ code: "UNSAFE_DESTINATION" });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(lookup).toHaveBeenCalledTimes(2);
  });

  it("limits redirects", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(null, { status: 302, headers: { location: "/again" } }),
        ),
    );
    await expect(
      extractJobPosting({ url: "https://example.com/job" }),
    ).rejects.toMatchObject({ code: "TOO_MANY_REDIRECTS" });
    expect(fetch).toHaveBeenCalledTimes(5);
  });

  it("rejects non-HTML and oversized responses", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("pdf", { headers: { "content-type": "application/pdf" } }),
      )
      .mockResolvedValueOnce(
        new Response("small", {
          headers: {
            "content-type": "text/html",
            "content-length": "1000001",
          },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      extractJobPosting({ url: "https://example.com/file" }),
    ).rejects.toMatchObject({ code: "UNSUPPORTED_CONTENT" });
    await expect(
      extractJobPosting({ url: "https://example.com/large" }),
    ).rejects.toMatchObject({ code: "RESPONSE_TOO_LARGE" });
  });

  it("maps timeout and network failures without leaking their details", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new DOMException("secret", "TimeoutError"))
      .mockRejectedValueOnce(new Error("connect ECONNREFUSED secret"));
    vi.stubGlobal("fetch", fetchMock);
    const timeout = extractJobPosting({ url: "https://example.com/slow" });
    await expect(timeout).rejects.toEqual(
      new JobPostingExtractionError(
        "FETCH_TIMEOUT",
        "The job posting took too long to respond.",
      ),
    );
    await expect(
      extractJobPosting({ url: "https://example.com/down" }),
    ).rejects.toMatchObject({
      code: "FETCH_FAILED",
      message: "The job posting could not be fetched.",
    });
  });
});
