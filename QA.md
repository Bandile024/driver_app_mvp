# Verification record

## Automated checks
- Mobile TypeScript: passed.
- Expo lint: passed.
- Expo Doctor: 18/18 passed.
- Production web export: passed after final heading/map-state adjustments (`mobile/dist-web`, bundle `index-e75ff282333537153885d0dadd8931d3.js`).
- Clean dependency install: passed after repairing the npm lockfile.
- Post-install TypeScript and uncached Expo lint: passed.
- Production Android Hermes export: passed with ETA/proof-save adjustments; the subsequent signed release rebuild also bundled successfully with the final heading/map-state adjustments.
- Final lint used `npx expo lint --no-cache` after clearing a stale parser result.
- Dispatch tests: 10 passed (HTTP + SQLite).
- Mobile core tests: 4 passed (production source with mocked native adapters).

Core coverage:
- Lost response after server commit → restart → duplicate-safe retry.
- Durable proof files stay outside Android AsyncStorage's large-row limit.
- Concurrent note writes are serialized.
- Account/server cache isolation.
- Delivery conflict preserves queued evidence while unrelated sync/new offers proceed.
- Proof/signature validation and ordered status transitions.

Dispatch coverage:
- Registration and email/phone login.
- Wrong password, forged token, and admin boundary.
- Driver assignment ownership.
- Required decline reason and proof.
- Duplicate mutation and mismatched mutation ID rejection.
- Proof and notes retained after SQLite/server restart.
- Shift-bound GPS, coordinate validation and out-of-order point rejection.
- Profile edits cannot change user ID or grant roles.
- Instruction/escalation notification queue uses the assigned driver's push token.

## Final signed APK — 27 October 2026
- File: `deliverables/eskort-driver-1.0.0.apk`, 74,038,064 bytes.
- Package/version: `za.co.eskort.driver`, `1.0.0 (1)`, minimum Android API 24, target API 36.
- SHA-256: `5721c35d815ec84b22c2955371ac0f860b6d402c7589e5cbe3c43164f3563bc4`.
- Signing certificate SHA-256: `4dd46a1e6ebb065d3e908c20abe6587c809fdf4e5f51fa97f54b6b6d3c24e4ec`.
- Signature verification, non-debuggable release check and 16 KiB ZIP alignment passed.
- Includes ARM64, ARMv7, x86 and x86_64 native libraries.
- Rebuilt successfully after heading/map-state adjustments using the preserved EAS-generated Android project and EAS signing credentials. All 42 checked source, asset and configuration files matched the workspace before compilation. Expo prebuild's two package-script substitutions were aligned first.
- The final Android JS bundle and signed release assembly passed. Replaced the deliverable and regenerated all three verification sidecars after checking the expected signing certificate.
- Final APK update installation on `emulator-5554` returned `Success`. The following activity launch timed out after 30 seconds.
- `.shots/release-final.png` captured a blank white screen with Android system bars. This is a failed visual acceptance result, not evidence of successful launch.
- The app process and React Native threads were present. Bounded logs showed skipped frames and long HWUI buffer/render delays, with no captured JavaScript exception or fatal crash. Absence of an exception in this limited capture does not establish app health.
- UIAutomator and activity inspection timed out again. Launching Android Settings as an independent control also timed out. This supports an emulator-wide problem, but the root cause and any app contribution remain unresolved.
- Release status: **signed, package-verified test candidate; native acceptance blocked**. Resume with a responsive emulator or physical Android device and complete `NATIVE-QA.md` before fleet deployment.

## Native QA — 27 October 2026
Test target: Pixel_8 emulator, Android 17, arm64 with 16 KiB pages; installed standalone release package `za.co.eskort.driver`, version 1.0.0 (1), without Metro or Expo Go.

Observed on the initial signed release:
- APK installation and cold launch passed.
- Branded login and explicit demo entry rendered; demo opened successfully.
- Today rendered the daily docket, seeded completed delivery, active delivery and new offers.
- Started a demo shift; the on-shift state and demo session survived emulator restart.
- Opened ESK-1042 and inspected customer/address, three packages, delivery window, ETA-pending fallback, instructions and dispatch notes.
- Customer/store call, SMS and email controls rendered. External handlers were not exercised.
- Entered and saved a delivery note; its exact text and timestamp remained after emulator restart.
- Advanced the seeded accepted delivery to en route; its action changed to “I've arrived.”
- Geographic tiles loaded partially, with destination marker and OpenStreetMap attribution visible. A complete map load and navigation handoff were not verified.

Screenshot review identified a clipped next-stop heading and an unclear partial-map loading state. The source now gives the heading flexible width and more line height, and maps track individual tile load/error states with an explicit retry control. TypeScript, uncached lint and production web export passed after these changes. Native visual confirmation of these adjustments is blocked by the test environment.

### Native QA blocker
The emulator intermittently stopped responding to UI automation and input. After restarting with software graphics and reduced worker/CPU load, inspection worked briefly, then UIAutomator, screenshots, logcat and activity inspection timed out. An ADB reconnect did not restore an available device. This prevents a completed end-to-end native acceptance result; the cause has not been isolated to the app or emulator.

The following are **not verified natively**: offer acceptance/decline, arrival and proof validation, camera/signature capture, proof draft reopening, offline completion and proof persistence after restart, failure/history filters, profile/photo editing, dark mode, local notification display/tap, End Shift and sign-out/re-entry. Domain and persistence tests listed above do not replace these checks.

Evidence captured before the final presentation adjustments:
- `.shots/release-launch.png`
- `.shots/release-demo.png`
- `.shots/release-order.png`
- `.shots/release-actions.png`

`NATIVE-QA.md` contains the remaining acceptance procedure. `SPEC-COVERAGE.md` maps all specification sections to implementation and qualifications.

## Environment limitations
CM Browser returned `no_target`: no active CookieMonster task window. No other browser was substituted.
No physical Android device is connected.
No Firebase google-services.json or FCM v1 credential was supplied.
No existing Eskort dispatch/commerce API was supplied.

## Field acceptance still needed
Physical camera/signature ergonomics, GPS accuracy, battery endurance across a shift, Android OEM background restrictions, real SMS/call/mail handlers and remote FCM delivery need checks on the intended fleet devices and connected environment.
