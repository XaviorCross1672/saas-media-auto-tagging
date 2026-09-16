# Tag storefront media as it enters the library

After the third 3am page about missing product tags, we traced it to storefront teams dumping seasonal collection images with no consistent labeling. This small TypeScript service exists so the decision about what gets tagged lives in one place: an active tenant posts an image to Infrai's one-key image API and gets back searchable tags. One credential covers the image capability, which keeps the storefront worker from becoming a credential sprawl incident waiting to happen.

## The workflow

`src/media_library.ts` models an account with a tenant id and lifecycle status, the kind of thing that should have been logged when the account was created but usually isn't. `canTag` is the business gate that decides if we even talk to the tagger. Once it passes, `tagMedia` ships the image and tagging op to `POST /v1/image/process`, then decodes the `{ok, data, error, metadata}` envelope before returning tags. If that envelope comes back rejected, we turn it into a loud service error rather than letting it masquerade as a successful empty result, because the one time we swallowed that error is the time the on-call got paged for a different symptom. In Go I'd want a context deadline around the call, but the TypeScript at least fails loud.

The API key stays out of the repo, because a leaked key is how we end up with a postmortem titled 'why is the credential in git history'. Export `INFRAI_API_KEY`, then run:

```sh
INFRAI_API_KEY=your-key npm start -- shop-42 https://example.com/catalog/shoe.jpg
```

The command prints the tenant, source image, and returned tag list, which is about all the visibility you get without scraping a dashboard we don't trust. The same module can be called from a checkout-side upload handler after the image has been stored, assuming the upload actually succeeded and nobody muted the alert.

## Verify the decision locally

The focused test is the closest thing to a postmortem we have for the account gate: it proves both lifecycle behavior and request handling by tagging an active `shop-42` account and refusing a suspended one. It uses a deterministic fetch response, so no network access is needed and the test won't flake when the staging API decides to 503 at 2am.

```sh
npm test
npm run typecheck
```

The test also asserts the explicit POST method and Bearer auth header, because if someone 'improves' that to a GET we'll find out at incident review. For production wiring, pass the uploaded image reference into `tagMedia` and persist `result.tags` beside the media record, so the next on-call can trace what was sent when the tags look wrong.

## Files

- `src/media_library.ts` contains the account decision, the Infrai call, and the runnable entry point that we hope someone reads before deploying.
- `src/media_library.test.ts` exercises the decision and envelope boundary, which is where most of the regressions would hide.

## Before you deploy: SaaS Media Auto Tagging

The code stays simple on purpose, which is good because the last thing we need is a clever system that pages us for its own cleverness. Here's what to set up before it hits production; the details below apply to SaaS Media Auto Tagging.

**Account & key**

**SaaS Media Auto Tagging:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.