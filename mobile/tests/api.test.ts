import test from "node:test";
import assert from "node:assert/strict";
process.env.EXPO_PUBLIC_API_URL = "https://gass.example.test/api";
Object.assign(globalThis, { __DEV__: false });
const { api, ApiError, onSessionExpired } = await import("../src/core/api.ts");

test("concurrent expired requests share one refresh and retain cookie transport", async () => {
  const original = globalThis.fetch;
  let refreshed = false;
  let refreshCount = 0;
  globalThis.fetch = async (url, init) => {
    assert.equal(init?.credentials, "include");
    assert.equal(
      (init?.headers as Record<string, string>)["X-Gass-Client"],
      "web",
    );
    if (String(url).endsWith("/auth/refresh")) {
      refreshCount++;
      await new Promise((resolve) => setTimeout(resolve, 10));
      refreshed = true;
      return Response.json({});
    }
    return Response.json(refreshed ? { ok: true } : {}, {
      status: refreshed ? 200 : 401,
    });
  };
  try {
    const result = await Promise.all([api("/one"), api("/two")]);
    assert.deepEqual(result, [{ ok: true }, { ok: true }]);
    assert.equal(refreshCount, 1);
  } finally {
    globalThis.fetch = original;
  }
});

test("writes are not retried on server errors and internal errors are not displayed", async () => {
  const original = globalThis.fetch;
  let count = 0;
  globalThis.fetch = async () => {
    count++;
    return Response.json(
      { message: "private database stack trace" },
      { status: 500 },
    );
  };
  try {
    await assert.rejects(
      api("/capaian/kinerja", { method: "PUT", body: "{}" }),
      (e) => e instanceof ApiError && !e.message.includes("database"),
    );
    assert.equal(count, 1);
  } finally {
    globalThis.fetch = original;
  }
});

test("revoked sessions notify the session owner", async () => {
  const original = globalThis.fetch;
  let expired = false;
  const stop = onSessionExpired(() => {
    expired = true;
  });
  globalThis.fetch = async () => Response.json({}, { status: 401 });
  try {
    await assert.rejects(api("/auth/me"));
    assert.equal(expired, true);
  } finally {
    stop();
    globalThis.fetch = original;
  }
});
