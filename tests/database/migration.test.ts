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

describe("interview migration", () => {
  it("creates fixed statuses, UTC timestamps, and nullable history ownership", () => {
    const migration = readFileSync(
      resolve("drizzle/0003_puzzling_maddog.sql"),
      "utf8",
    );
    expect(migration).toContain(
      "CREATE TYPE \"public\".\"interview_status\" AS ENUM('Scheduled', 'Completed', 'Cancelled')",
    );
    expect(migration).toContain(
      '"scheduled_at" timestamp with time zone NOT NULL',
    );
    expect(migration).toContain('"interview_id" uuid');
    expect(migration).toContain(
      "activity_history_interview_id_interviews_id_fk",
    );
  });
});

describe("company uniqueness migration", () => {
  it("enforces a case-insensitive unique company name index", () => {
    const migration = readFileSync(
      resolve("drizzle/0004_wooden_franklin_storm.sql"),
      "utf8",
    );
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "companies_name_lower_unique"',
    );
    expect(migration).toContain('lower("name")');
  });
});
