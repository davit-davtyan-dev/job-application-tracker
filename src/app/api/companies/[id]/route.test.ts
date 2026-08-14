import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const { deleteCompany, updateCompany } = vi.hoisted(() => ({
  deleteCompany: vi.fn(),
  updateCompany: vi.fn(),
}));

vi.mock("@/services/company", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/company")>()),
  deleteCompany,
  updateCompany,
}));

import {
  CompanyNameConflictError,
  CompanyNotFoundError,
} from "@/services/company";

import { DELETE, PATCH } from "./route";

const id = "0f1db9a6-4ce4-4ab9-a8d8-f585f9fb3df8";
const context = (value = id) => ({ params: Promise.resolve({ id: value }) });
const patchRequest = (body: string) =>
  new Request(`http://localhost/api/companies/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body,
  });

describe("/api/companies/[id]", () => {
  beforeEach(() => {
    deleteCompany.mockReset();
    updateCompany.mockReset();
  });

  it("updates through the service", async () => {
    updateCompany.mockResolvedValue({ id, name: "Acme", notes: null });
    const response = await PATCH(
      patchRequest(JSON.stringify({ name: "Acme", notes: "" })),
      context(),
    );
    expect(response.status).toBe(200);
    expect(updateCompany).toHaveBeenCalledWith({ id, name: "Acme", notes: "" });
  });

  it("rejects malformed JSON and validation failures", async () => {
    expect((await PATCH(patchRequest("{"), context())).status).toBe(400);
    updateCompany.mockRejectedValue(z.uuid().safeParse("bad").error);
    expect((await PATCH(patchRequest("{}"), context("bad"))).status).toBe(400);
  });

  it.each([
    [new CompanyNameConflictError(), 409, "COMPANY_NAME_CONFLICT"],
    [new CompanyNotFoundError(), 404, "COMPANY_NOT_FOUND"],
    [new Error("database secret"), 500, "INTERNAL_ERROR"],
  ])(
    "maps update errors without leaking details",
    async (error, status, code) => {
      updateCompany.mockRejectedValue(error);
      const response = await PATCH(
        patchRequest(JSON.stringify({ name: "Acme" })),
        context(),
      );
      expect(response.status).toBe(status);
      expect(await response.json()).toMatchObject({ error: { code } });
    },
  );

  it("deletes through the service and returns no content", async () => {
    deleteCompany.mockResolvedValue({ id });
    const response = await DELETE(
      new Request(`http://localhost/api/companies/${id}`),
      context(),
    );
    expect(response.status).toBe(204);
    expect(deleteCompany).toHaveBeenCalledWith(id);
  });

  it("maps invalid, missing, and internal delete failures", async () => {
    deleteCompany.mockRejectedValueOnce(z.uuid().safeParse("bad").error);
    expect(
      (await DELETE(new Request("http://localhost"), context("bad"))).status,
    ).toBe(400);
    deleteCompany.mockRejectedValueOnce(new CompanyNotFoundError());
    expect(
      (await DELETE(new Request("http://localhost"), context())).status,
    ).toBe(404);
    deleteCompany.mockRejectedValueOnce(new Error("secret"));
    const response = await DELETE(new Request("http://localhost"), context());
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("secret");
  });
});
