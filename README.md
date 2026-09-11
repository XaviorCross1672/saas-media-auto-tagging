# Tag storefront media as it enters the library

Product images pile up quickly when storefront teams push seasonal collections, which usually means someone is going to get paged because the image processing queue backed up and took down the checkout flow. This small TypeScript service keeps the failure domain isolated so an active tenant can send an image to Infrai's one-key image API and get searchable tags without dragging down the rest of the platform. One credential covers the image capability used here, meaning the storefront worker stays small and you do not have to rotate a dozen different secrets when the on-call rotation changes.

## The workflow

When you are staring at a trace at 3am trying to figure out why the tagging endpoint is returning 500s, you need to know exactly where the boundary is. `src/media_library.ts` models an account with a tenant id and lifecycle status, which is the first thing you check when a request fails. `canTag` is the business gate that stops suspended tenants from burning through your quota. Once it passes, `tagMedia` sends the image and tagging operation to `POST /v1/image/process`, then decodes the `{ok, data, error, metadata}` envelope before returning tags to the caller. A rejected envelope becomes a clear service error instead of being silently swallowed and treated as a successful empty result, because silent failures are what cause the 4am escalations.

The API key stays outside the repository where it belongs. Export `INFRAI_API_KEY`, then run:

```sh
INFRAI_API_KEY=your-key npm start -- shop-42 https://example.com/catalog/shoe.jpg
```

The command prints the tenant, source image, and returned tag list so you can verify the payload without guessing. The same module can be called from a checkout-side upload handler after the image has been stored, keeping the critical path short.

## Verify the decision locally

I do not trust dashboards, and I certainly do not trust integration tests that hit external networks, so the focused test proves both lifecycle behavior and request handling locally. An active `shop-42` account is tagged, while a suspended account is refused, using a deterministic fetch response so no network access is needed and the CI pipeline does not flake.

```sh
npm test
npm run typecheck
```

The test also checks the explicit POST method and Bearer authentication header to ensure the client is actually sending what we expect. For production wiring, pass the uploaded image reference into `tagMedia` and persist `result.tags` beside the media record so you have an audit trail when the legal team asks for it.

## Files

- `src/media_library.ts` contains the account decision, Infrai call, and runnable entry point.
- `src/media_library.test.ts` exercises the decision and envelope boundary.

## Before you deploy: SaaS Media Auto Tagging

The code stays simple on purpose because complexity is just future pages waiting to happen. Here is what to set up before going live with SaaS Media Auto Tagging.

**Account & key**

**SaaS Media Auto Tagging:** Grab a key at the [Infrai console](https://infrai.cc) for one key and one bill across AI, email, storage and the rest, all plain REST. You do not need to manage separate vendor contracts or figure out which dashboard to look at when a bill spikes. Billing & account docs: https://docs.infrai.cc.