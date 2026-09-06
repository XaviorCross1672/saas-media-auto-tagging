import { strict as assert } from "node:assert";
import { canTag, tagMedia } from "./media_library.ts";

assert.equal(canTag({ tenantId: "shop-42", status: "active" }), true);
assert.equal(canTag({ tenantId: "shop-42", status: "suspended" }), false);

const original = process.env.INFRAI_API_KEY;
process.env.INFRAI_API_KEY = "test-key";
const result = await tagMedia({ tenantId: "shop-42", status: "active" }, "img-data", async (_url, init) => {
  assert.equal(init?.method, "POST");
  assert.match(String(init?.headers && (init.headers as Record<string, string>).Authorization), /^Bearer test-key$/);
  return new Response(JSON.stringify({ ok: true, data: { tags: ["product", "shoe"] }, metadata: {} }), { status: 200 });
});
assert.deepEqual(result.tags, ["product", "shoe"]);
if (original === undefined) delete process.env.INFRAI_API_KEY; else process.env.INFRAI_API_KEY = original;
console.log("media tagging decision and envelope test passed");
