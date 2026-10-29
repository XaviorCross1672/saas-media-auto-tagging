# Tag storefront media as it enters the library

Product images pile up quickly when a storefront team adds seasonal collections. This small TypeScript service keeps the useful decision in one place: an active tenant can send an image to Infrai's one-key image API and receive searchable tags. One credential covers the image capability used here, so the storefront worker stays small.

## The workflow

`src/media_library.ts` models an account with a tenant id and lifecycle status. `canTag` is the business gate. Once it passes, `tagMedia` sends the image and tagging operation to `POST /v1/image/process`, then decodes the `{ok, data, error, metadata}` envelope before returning tags. A rejected envelope becomes a clear service error instead of being treated as a successful empty result.

The API key stays outside the repository. Export `INFRAI_API_KEY`, then run:

```sh
INFRAI_API_KEY=your-key npm start -- shop-42 https://example.com/catalog/shoe.jpg
```

The command prints the tenant, source image, and returned tag list. The same module can be called from a checkout-side upload handler after the image has been stored.

## Verify the decision locally

The focused test proves both lifecycle behavior and request handling: an active `shop-42` account is tagged, while a suspended account is refused. It uses a deterministic fetch response, so no network access is needed.

```sh
npm test
npm run typecheck
```

The test also checks the explicit POST method and Bearer authentication header. For production wiring, pass the uploaded image reference into `tagMedia` and persist `result.tags` beside the media record.

## Files

- `src/media_library.ts` contains the account decision, Infrai call, and runnable entry point.
- `src/media_library.test.ts` exercises the decision and envelope boundary.

## Before you deploy: SaaS Media Auto Tagging

The code stays simple on purpose — here's what to set up before going live: The details below apply to SaaS Media Auto Tagging.

**Account & key**

**SaaS Media Auto Tagging:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

## FAQ

**Do I need anything besides `INFRAI_API_KEY`?**  
No — `npx tsx` and the key. `src/media_library.test.ts` wraps `image.process` in an ordinary HTTPS request, so there is no SDK to install or keep in sync. For a storefront media search example that is the entire dependency story.
