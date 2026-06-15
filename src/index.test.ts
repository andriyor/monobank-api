import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { MonobankApi, MonobankApiError } from "./index";

const mockResponse = (
  status: number,
  body: string,
  { ok = status >= 200 && status < 300 } = {}
) => ({ status, ok, text: async () => body }) as Response;

describe("MonobankApi error handling", () => {
  const api = new MonobankApi("test-token");

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("parses successful JSON responses", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse(200, JSON.stringify([{ id: "1" }]))
    );

    const data = await api.getStatements({ account: "acc", from: "1", to: "2" });

    expect(data).toEqual([{ id: "1" }]);
  });

  test("throws MonobankApiError with errorDescription from JSON error body", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse(400, JSON.stringify({ errorDescription: "Unknown account" }))
    );

    await expect(api.clientInfo()).rejects.toMatchObject({
      name: "MonobankApiError",
      status: 400,
      errorDescription: "Unknown account",
      message: "Unknown account",
    });
  });

  test("flags 429 responses as rate limited", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse(429, JSON.stringify({ errorDescription: "Too many requests" }))
    );

    const error = (await api.clientInfo().catch((e) => e)) as MonobankApiError;

    expect(error).toBeInstanceOf(MonobankApiError);
    expect(error.isRateLimited).toBe(true);
    expect(error.isForbidden).toBe(false);
  });

  test("handles non-JSON 403 block bodies", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse(403, "glory to Ukraine! glory to the heroes!")
    );

    const error = (await api.clientInfo().catch((e) => e)) as MonobankApiError;

    expect(error).toBeInstanceOf(MonobankApiError);
    expect(error.isForbidden).toBe(true);
    expect(error.errorDescription).toBeUndefined();
    expect(error.body).toContain("glory to Ukraine");
    expect(error.message).toBe("Monobank API request failed with status 403");
  });

  test("wraps network failures", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("ECONNRESET"));

    const error = (await api.clientInfo().catch((e) => e)) as MonobankApiError;

    expect(error).toBeInstanceOf(MonobankApiError);
    expect(error.status).toBe(0);
    expect(error.message).toContain("ECONNRESET");
  });
});
