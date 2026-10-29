# Eskort Driver | Good food. Good journeys.

## Brief
Native Android-first driver app, built with Expo SDK 54 / React Native and Expo Router.
Drivers need to know the next stop, record evidence, and trust that work survives connectivity loss.
Specification: spec.txt plus signature capture, acceptance/decline reasons, SMS/email contact.
Assumption: no existing dispatch API or FCM credentials provided. Ship explicit sample-data demo plus a runnable authenticated dispatch service and configurable server URL. Real accounts never silently fall back to demo.
The juliobsz/skills awwwards process is adapted to native UI: brand concept, deliberate typography, useful state transitions, mobile-first screenshots, independent criticism. WebGL, web SEO and scroll theatre do not belong in a working driver's app.

## Concepts
1. The delivery docket (material): a legible digital manifest with journey progress and a final proof stamp. Signature: the task progresses from a docket into a delivery receipt. Emotion: confidence. Screenshot: cream task sheet, dark route panel, yellow action. Anchor: Eskort's physical deliveries. Originality 4 / fit 5 / feasibility 5 / portability 3.
2. Mzansi in motion (place): a route-line system connecting neighbourhoods. Signature: destination pin becomes the next-stop card. Emotion: momentum. Screenshot: route map + delivery time. Anchor: South African neighbourhood delivery network. 4 / 4 / 4 / 3.
3. Good food, delivered (brand identity): Eskort's chunky shop-sign lettering and gold pill buttons become a driver's working kit. Signature: completed stop becomes a stamped receipt. Emotion: familiar and capable. Screenshot: giant native brand heading with gold next action. Anchor: actual supplied EskortSpaza font, brand logo and frontend component rules. 4 / 5 / 5 / 1.

Chosen: 3, supported by functional docket structure. The exact Eskort assets make it recognisable.

## Concept card
Idea: Eskort's shop-sign personality, made into a calm working companion for the road.
Metaphor: a delivery docket that travels with you.
Signature: ordered progress checkpoints end in a signed delivery receipt.
Emotion: confident, practical, warmly South African.
Motion verb: settle into place. Native short slide transitions and press compression.
Screenshot: 'Let's get moving.' with gold shift control and a clearly prioritised next stop.

## System
Ground #FCF9F1, ink #1A1A1A, muted #62605B, line #DEDAD0, accent #F6C000, curtain #003254.
Semantic colours: success #007748, failure #DC2626.
Dark mode: #151817 ground, #202522 surfaces, #FAF7EF ink, #BFC6BF muted.
Fonts: provided EskortSpazaClean for expressive display; supplied Montserrat Regular / SemiBold / Bold for operational text.
Brand source: ../frontend/eskortreskin2026/frontend/assets.
Components ported: _components.less pill buttons with directional arrow, outlined secondary action, 18px card radius from _mixins.less. Tokens and type from _typolanding.less.
4-column phone grid, 20px outer gutter, 8px spacing base. Minimum controls 48px. Body 14–16px, metadata 12–13px, section heads 24–32px, hero 44px.
Card radius 18; buttons 100. Quiet at rest to save battery. Reduced motion skips decorative motion; all information stays visible.

## Screen composition
Auth: brand bar / oversized two-line greeting / short context / form / gold primary / demo secondary.
Today: brand + shift state / greeting / dark progress docket / next-stop priority / incoming orders / bottom tabs.
Route: live geographic map with stop markers / selected stop sheet / navigation action.
Details: back / status + order reference / customer and destination / progress rail / contact / dispatch notes / proof / sticky next action.
History: heading / status chips / date filter / completed docket rows with timestamps and proof.
Profile: avatar / editable identity / shift summary / settings / server connection / support / sign out.
Proof: recipient / camera / signature canvas / note / location timestamp / submit.
Failure/decline: required reason selector plus optional detail; no accidental status change before confirm.

## Honesty & genericness check
No invented efficiency statistics. Counts derive from actual cached tasks. Sample deliveries are marked demo.
No stock dashboard gradient, anonymous Inter heading, fabricated geographic map or fake live indicators.
Tiles use real OpenStreetMap geography and attribution; offline map fallback shows exact coordinates and the cached address.
No continuous animation. Battery-saving tracking is explicit, shift-bound and permission-based.

## Acceptance and verification
Typecheck, lint, server authorization/state-machine tests, production web preview, native APK build and signature verification.
Test offline completion, restart recovery, durable proof, duplicate sync, status filters, profile edits, declined reason, deep-linked order notifications.
Remote push, physical GPS/battery endurance, real camera and calling require a configured backend and physical Android device.
