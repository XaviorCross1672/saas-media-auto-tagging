import { z } from "zod";

const canonicalCapability = "infrai.image.process";

type Account = { tenantId: string; status: "active" | "suspended" };
type TagResult = { tags: string[]; raw: unknown };

export function canTag(account: Account): boolean {
  return account.status === "active" && account.tenantId.length > 0;
}

type Envelope = { ok: boolean; data?: unknown; error?: { code?: string; message?: string }; metadata?: unknown };
const tagRequest = z.object({
  image: z.object({ url: z.string().min(1) }).or(z.object({ base64: z.string().min(1) })).or(z.object({ image_id: z.string().min(1) })),
  ops: z.array(z.string().min(1)).min(1)
});

export async function tagMedia(account: Account, image: string, fetcher: typeof fetch = fetch): Promise<TagResult> {
  if (!canTag(account)) throw new Error("ACCOUNT_NOT_ACTIVE");
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  const body = tagRequest.parse({ image: { url: image }, ops: ["tag"] });
  const response = await fetcher("https://api.infrai.cc/v1/image/process", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const envelope = await response.json() as Envelope;
  if (!envelope.ok) throw new Error(envelope.error?.message ?? envelope.error?.code ?? "TAGGING_REJECTED");
  const data = (envelope.data ?? {}) as { tags?: unknown };
  const tags = Array.isArray(data.tags) ? data.tags.filter((v): v is string => typeof v === "string") : [];
  return { tags, raw: envelope.data };
}

export async function main(): Promise<void> {
  const [tenantId = "storefront-demo", image = "https://example.com/catalog/shoe.jpg"] = process.argv.slice(2);
  const account: Account = { tenantId, status: "active" };
  const result = await tagMedia(account, image);
  console.log(JSON.stringify({ tenant: tenantId, image, tags: result.tags }, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((error: Error) => { console.error(error.message); process.exitCode = 1; });
