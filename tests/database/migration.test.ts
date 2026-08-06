import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("foundation migration", () => {
  it("uses timestamptz defaults that preserve the current instant across session time zones", () => {
    const migration = readFileSync(
      resolve("drizzle/0000_true_manta.sql"),
      "utf8",
    );

    expect(migration).toContain(
      "timestamp with time zone DEFAULT now() NOT NULL",
    );
    expect(migration).not.toContain("timezone('utc', now())");
  });
});
