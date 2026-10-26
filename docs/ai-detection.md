# AI-content reports

`/ai-check` analyzes pasted Reddit text and returns a private Discord report. The initial backend is Pangram. The feature ships **disabled** in both configurations; no credentials are needed to build or test it.

## Using the command

- Run `/ai-check` to paste up to 4,000 characters into a modal. The form identifies the detection provider receiving the text.
- For longer text, use `/ai-check file:` with a UTF-8 `.txt` attachment. Pangram input must contain 50–5,000 words and fit within 256 KiB. The bot rejects oversized input instead of truncating it or submitting multiple paid scans.
- In the configured server, anyone in `#subreddit-chat` or a direct child thread can run it. Members with the configured **Subreddit Mod** role can also run it in other channels they can view. This is a channel **OR** role rule; other moderator/admin roles do not bypass it. DMs and other servers are rejected.
- The initial response, segment navigation, and errors are ephemeral. The summary distinguishes AI-generated, AI-assisted, and human text fractions, preserves the provider's explanation and uncertainty, and includes provider/model/version information when available.
- `View segments` displays labeled text with pagination. `ai-report.txt` contains the entire submitted text, normalized text if different, all segment labels, verified positions, and budget information. The chart shows classifications across relative text position, including overlaps; blank areas are not assumed to be human. Missing/unverifiable positions or chart-rendering failures are disclosed and do not discard the text report.
- If analysis completes but report delivery fails, SeaBot retries the same private response and checks whether it was delivered. If delivery still cannot be confirmed, run `/ai-check` without a file in the original channel before expiry to recover the saved result. Recovery rechecks access and never submits another scan. New file submissions in that channel are rejected while a report awaits recovery. After expiry or restart, recovery is unavailable and a new scan may incur another charge.
- `Post report to channel` publishes the summary, chart when available, and **complete text attachment** in the channel where the command ran. Only the requester can use this action. It rechecks current permissions and uses the already computed result without another scan. Mentions in submitted/provider text cannot ping users.

Percentages describe the share of text classified by the provider, not a probability that a person used AI. A “Possibly AI” result can therefore classify 100% of a short sample as AI while still carrying low confidence. AI-assisted content is displayed separately. Reports are aids for human review; the command takes no moderation action.

## Configuration for the later live-validation step

Merge these fields into the appropriate existing config (`src/devConfig.json` for development or `src/seabotConfig.json` for production). Fill in actual Discord IDs before enabling; empty IDs deliberately fail closed.

```json
{
  "aiDetection": {
    "enabled": false,
    "guildId": "",
    "provider": "pangram",
    "model": "pangram-4",
    "usdPer100Words": 0.05
  },
  "channelIds": {
    "SUBREDDIT_CHAT": ""
  },
  "roleIds": {
    "subredditModerator": ""
  }
}
```

`roleIds.subredditModerator` is a new, distinct role setting. Do not substitute the existing general moderator/admin role. IDs survive channel/role renames; display names are not used for authorization. Missing/invalid IDs, model, price, provider, or key disable execution. The slash command remains discoverable through SeaBot's existing guild command registration and explains privately when disabled. Do not apply Discord's administrator-only default command permissions: that would exclude the intended channel users.

Supply `PANGRAM_API_KEY` through the existing environment/secret mechanism when live validation is authorized. Never commit it. Existing `botToken` configuration is still needed to run SeaBot. The provider and handlers are constructed lazily; command registration does not submit an analysis or probe Pangram. Changes to active provider settings require restarting the process.

The bot needs its usual application-command permissions. Public posting additionally requires View Channel, Send Messages (Send Messages in Threads for threads), Embed Links, and Attach Files. The requesting member must still be able to view and post in the destination. Private-thread membership is checked, and archived/locked threads are not used for publishing.

## Shared API budget

Each report includes scan usage/cost and remaining API balance fields. The Pangram adapter currently reports **estimated** 100-word blocks, rounded up, multiplied by `usdPer100Words`. The initial configured rate is $0.05 per block; confirm the model's current price before enabling. SeaBot's Unicode word count may differ from Pangram's billing count.

**The approved initial release uses estimated scan costs; remaining API credits are explicitly unavailable.** This is a deliberate first-release scope decision. Reports provide an API account information link, and moderators can check the account separately. An authoritative balance requires a verified endpoint/response contract in a future change. The provider result supports amount, units, and observation timestamp, but SeaBot never equates web-app allowances with API credit, infers a balance from local scan counts, or invents zero credits.

One scan per user may run at a time, with 60 seconds between paid submissions and at most two simultaneous scans across this SeaBot process. Invalid text does not consume a submission or start the cooldown. There is no queue, daily spend ledger, automatic top-up, or provider failover. These limits reduce accidental use; they are not an account-wide spending cap. Use the provider's account controls for a hard budget limit, and run a single SeaBot instance for these in-memory gates.

Pangram receives exactly one `POST /task` with the configured model and `public_dashboard_link: false`. SeaBot polls `GET /task/{task_id}` with bounded backoff, honoring `Retry-After` for polling limits. Requests have 10-second timeouts within a five-minute analysis deadline. Transient GET failures may retry; POST submission never automatically retries. If submission or completion is uncertain, the private error explains that a charge may still occur. Repeating the command later is a new, potentially billable scan.

## State and privacy

Report controls are bound to requester, server, original channel, and report message. Access is checked on submission and subsequent button actions. A synchronous publish lock plus a stable Discord nonce protects double-clicks. A confirmed public post is remembered; an ambiguous send failure disables further posting of that report rather than risking duplicates. A definite permission/API rejection can be retried after correction.

Up to 100 sessions are retained in memory, including pending modals. Old inactive entries may be evicted at capacity. Controls expire at the earlier of ten minutes after completion or fourteen minutes after the analysis interaction began. A restart loses reports and pending task state; no background task recovery or resubmission occurs. Running work is bounded by the analysis deadline. Provider responses are capped at 4 MiB and analyzed text at 256 KiB.

Expiry removes bot-side controls/state; it does **not** delete already delivered Discord messages or attachments, or change Pangram retention. Ephemeral delivery limits Discord visibility; the submitted text still goes to Pangram and the report still goes to Discord. File input is read only from the Discord attachment hosts, without redirects, using strict UTF-8 decoding and an enforced streamed byte limit. No Reddit fetching is performed.

This command opts out of command telemetry and raw diagnostic logging. Only fixed outcomes are logged. Shared router failures use a private error boundary before diagnostic output, including when debug mode is enabled. SDK errors, interaction tokens, input text, and raw provider responses must not be logged.

## Implementation boundaries

```text
Existing slash router + interaction event router (private error boundaries)
    -> aiCheck command composition (config and environment)
    -> createAiCheckFeature (testable configuration and dependency wiring)
    -> AiCheckInteractions (authorization, modal, ephemeral response, buttons)
    -> AiCheckService (submission gates, report lifetime, publish lock)
    -> AiDetectionProvider
         -> PangramProvider (HTTP, polling, normalization, estimated usage)

DetectionResult -> report.ts (summary, segment pages, PNG, text attachment)
```

`AiDetectionProvider` exposes a display name, minimum input length, and one cancellable analysis operation. `DetectionResult` has provider-independent text fractions, classified segments, optional verified ranges, usage, and balance. Unsupported metrics remain absent and render as unavailable. Pangram field names, labels, HTTP endpoints, credentials, and polling remain in its adapter.

The feature factory has no server import or startup side effects. Tests inject configuration, credentials, and a provider without modifying deployment configs or the module cache. Production uses a thin composition wrapper to read SeaBot's existing configuration. The shared private error boundary recognizes a common `UserFacingError`; it does not import AI-detection code. Segment pages are generated once per navigation action and are not generated for summary views.

To support another provider, implement the same interface, normalize its semantics honestly, and add a configuration/composition branch plus fixture tests. Do not translate a document confidence score into a text percentage or recompute aggregate fractions from overlapping windows. A renderer fixture already covers another provider without percentage/segment/budget data. There is no registry framework, database migration, new dependency, multi-provider orchestration, or ensemble score in this implementation.

Until the provider's offset convention is independently confirmed, positions are checked against returned text under code-point and UTF-16 interpretations. If both match but point to different occurrences of repeated text, positions are omitted. Unambiguous ranges are converted to end-exclusive UTF-16 positions. This compatibility check is not proof of the provider's contract; live acceptance must establish the convention so the adapter can use it explicitly. The chart is based on positions, not rounded aggregate percentages.

## Offline verification

Use Node.js **22.12 or newer**, matching the minimum required by the existing Discord prerelease dependency. The implementation uses that pinned library's modal/builders APIs.

```sh
npm ci
npm test
npm run typecheck
npm run container:production
```

Dependency installation uses the package registry; the tests and compilation need no Discord or Pangram credentials. `npm test` compiles into ignored `.test-dist/` and runs Node's built-in test runner. Its preload rejects real fetch, HTTP(S), socket, TLS, and WebSocket connections. Provider behavior uses injected fakes and synthetic fixtures; these fixtures test expected behavior, not an independently verified vendor contract. Discord regression tests also use the pinned SDK's real cache and webhook serialization with mocked REST. Tests never execute the server entrypoint; only the existing shared router requires a composition-root stub. Do not run `npm start`, `npm run seabot`, or the server entrypoint for offline validation.

Coverage includes enabled/disabled configuration fixtures; input/UTF-8/size boundaries; task failures, backoff, and non-retryable submissions; Unicode, ambiguous, and invalid positions; private responses and debug logging; channel-or-role access and stale private-thread membership; concurrency, cooldown, expiry, and duplicate sharing; delivery failure/recovery; absent provider metrics; long Discord payloads; real PNG generation and chart failure. Tests validate behavior without requiring deployable configuration files to stay empty or disabled.

Tests are mandatory in CI and the container build. CI also builds the final production Alpine image, then runs `tests/container-smoke.cjs` inside it with `--network none`. That smoke test loads the packaged config and verifies native canvas, fonts, and PNG encoding without importing the bot or starting its entrypoint. Image builds may download build dependencies; neither the tests nor the runtime smoke test contact application services.

## Deferred live acceptance and rollback

No Discord/Pangram connection or paid API request is part of this change's development validation. Once authorized separately:

1. Require successful unit/SDK tests, production bundle build, final container build, and network-disabled runtime smoke test for the candidate commit. Keep the feature disabled until the following acceptance steps are authorized and completed.
2. Confirm account access to the configured async API/model, actual task schema and offset semantics, pricing, retention, and available account spending controls. Capture sanitized contract fixtures for short uncertain, human, assisted, and mixed results. Keep the feature disabled if these differ from the adapter's assumptions. Remaining-credit retrieval is future work under the approved estimates-only scope.
3. Configure the key and development-server IDs, then enable only the development configuration. Verify Discord desktop/mobile, modal and file input, the channel/role rule, private-thread revocation, ephemeral attachments, paging, expiry, delivery recovery, and public sharing. Confirm actual billing impact and the honest unavailable-balance display.
4. Verify exactly one active SeaBot instance and avoid overlapping old/new instances during rollout; in-memory sessions and limits are process-local. Stop the old instance before starting the new one. Existing report controls are lost on restart. Account-level spend controls must be verified separately from the bot's concurrency/cooldown limits.
5. Exercise rollback in development: rebuild with `aiDetection.enabled: false`, deploy, restart, and verify commands/controls report disabled without calling Pangram. Keep the last known-good image/commit available. Enable production only after acceptance. Disabling cannot cancel provider work already submitted, refund charges, or revoke public posts.
