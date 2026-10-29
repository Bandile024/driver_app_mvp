# Eskort Driver

Android-first React Native application built with Expo SDK 54 and Expo Router. The supplied Eskort frontend's Spaza font, Montserrat, logo, brand colours, pill buttons and card rules are adapted to native components. Art direction is documented in `DESIGN.md`, following the requested juliobsz/skills creative process.

## Try the app

This repository contains the source, assets, tests and documentation. The `deliverables/` APK and verification files are local build outputs and are not tracked in Git. Obtain the signed test APK separately from the project owner, or follow the Android build instructions below.

Install [`deliverables/eskort-driver-1.0.0.apk`](deliverables/eskort-driver-1.0.0.apk), open **Eskort Driver**, and choose **Explore the demo** (scroll below the sign-in form). No account or server is required for the sample-data experience. Demo changes persist on the device.

The signed release APK is 74,038,064 bytes (70.6 MiB), version **1.0.0 (1)**, package **za.co.eskort.driver**. Transfer the APK to an Android phone, open it and allow installation from that file source when Android asks. Android 7.0/API 24 or later is required. The same APK supports ARM and x86 devices. No Metro server or Expo Go is needed.

The `.sha256`, `.verification.json` and `.verification.txt` files beside the APK record its checksum, signing certificate, non-debuggable release flag and verified 16 KiB ZIP alignment. Share the APK as a file attachment or through your organisation's file-sharing service; no public download has been published.

**Release status: signed test candidate; full native acceptance is blocked.** TypeScript, lint, production exports, release assembly and APK signature/alignment checks passed. The final APK installed successfully, but its launch timed out and a screenshot showed a blank screen. Android Settings also timed out on the same emulator; the root cause remains unresolved. A responsive emulator or physical Android device is required to establish final launch and end-to-end delivery behavior.

Initial native smoke checks, before the final heading/map-state adjustments, passed for launch, demo entry, shift/session persistence, delivery details, saved notes and the en-route transition. Those results do not establish acceptance of the final APK. Camera/signature proof, offline completion, settings and the final visual adjustments remain unverified natively.

See [`QA.md`](QA.md) for actual results, [`NATIVE-QA.md`](NATIVE-QA.md) for remaining device checks, and [`SPEC-COVERAGE.md`](SPEC-COVERAGE.md) for every specification item and its qualifications. Live dispatch needs an HTTPS deployment; remote Android push needs Firebase/FCM configuration and a rebuild, as detailed below.

Try: start a demo shift → open a delivery → accept → on my way → arrived → take a photo → collect the recipient's signature → complete. History includes successful, failed and declined filters. Profile → **Simulate a new delivery** inserts a new offer; enabling notifications first also triggers a local notification.

The camera, GPS, notifications and phone/SMS/email handoff require a native device and permissions. Demo contact information is intentionally non-routable.

## Included functionality

- Register and log in via an authenticated dispatch API; email or phone login, persistent native SecureStore JWT.
- Offline cached assignments, durable mutation outbox and automatic retry on reconnect/app resume.
- 30-second foreground feed refresh; pull-to-refresh; new offer banner.
- Accept/decline and failure reasons; ordered accepted → en route → arrived → delivered progression.
- Real OpenStreetMap destination tiles and markers; Google Maps/Waze navigation handoff.
- Store/customer phone, SMS and email actions, plus per-delivery notes for dispatch.
- Camera proof, handwritten signature, recipient, capture time, GPS or an explicit GPS exception reason.
- Durable proof draft and local image files; sync uploads proof and retains a local copy.
- Completion history, status/date filters, profile photo/editing, derived stats and dark mode.
- Explicit shift-bound battery-aware background GPS, latest-point queue, Android foreground service.
- Background sync scheduled through Expo/Android WorkManager (OS controlled, minimum 15 minutes).
- Runnable Node 24 + SQLite dispatch service: authentication, assignments, instruction updates/escalations, push-token registration, push sending/retry queue, driver GPS, proof, notes and admin API/CLI.
- Automated authorization, delivery lifecycle, persistence, idempotency and offline-sync tests.

## Run locally

Requires Node 24 and npm.

```sh
cd mobile
npm ci
npm start
```

Web preview (native capability checks must still be done on Android):

```sh
cd mobile
npx expo export --platform web
npx serve dist --single -l 8081
```

Tests:

```sh
cd mobile
npm run typecheck
npm run lint
npm test
npx expo-doctor
```

```sh
cd server
npm test
```

The core tests execute production TypeScript modules with mocked native filesystem/network adapters; they are not device tests. Dispatch tests use real HTTP and SQLite.

## Connect real drivers and dispatch

1. `cd server`, copy `.env.example` to `.env`.
2. Generate **two separate** secrets with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` and set `JWT_SECRET` and `ADMIN_TOKEN`.
3. Run `npm start`. Default bind: `127.0.0.1:4040`.
4. Expose the API through your organisation's HTTPS reverse proxy. Keep the SQLite volume persistent. Set `HOST=0.0.0.0` only when your deployment requires it.
5. Enter the HTTPS server origin on the app's sign-in screen; create a driver account.
6. List drivers and assign a delivery:

```sh
node --env-file=.env dispatch.mjs drivers
# Copy order.example.json, fill driverId, actual contacts, destination and current time window.
node --env-file=.env dispatch.mjs assign your-order.json
node --env-file=.env dispatch.mjs orders
```

`DISPATCH_URL` overrides the CLI's default `http://127.0.0.1:4040`. Admin credentials never belong in the mobile app.

Authenticated driver endpoints:
- `POST /api/auth/register` `{identifier: email, password, name, phone}`
- `POST /api/auth/login` `{identifier: emailOrPhone, password}`
- `GET /api/snapshot`
- `POST /api/mutations` `{id, kind, orderId?, payload, createdAt}`
- `POST /api/location`
- `POST /api/push-token`

Admin endpoints (Bearer `ADMIN_TOKEN`):
- `GET /api/admin/drivers` — profiles, shift state, most recent GPS point
- `GET /api/admin/orders` — assignments including proof/notes
- `POST /api/admin/orders` — see `server/order.example.json`
- `PATCH /api/admin/orders/:id` `{instructions?, dispatchNotes?, eta?: ISO8601 | null, escalation?: true}`

This is a single-dispatch reference backend, not an integration with an existing Eskort commerce system. It provides an API/CLI, not a store-admin web dashboard. OTP is optional in the spec and is not implemented.

## Remote push setup

The Expo project is `@rblucky/eskort-driver`, ID `4a216e33-27b5-48d7-a93d-f297d5020fc3`.

1. Add the Android app `za.co.eskort.driver` to the intended Firebase project.
2. Supply Firebase `google-services.json` through the `GOOGLE_SERVICES_JSON` build environment file variable.
3. Configure the matching FCM v1 service account for this project in EAS credentials.
4. Rebuild the APK, sign into a real dispatch account, then enable **Delivery notifications** in Profile.
5. Assign/update/escalate an order through the admin API. The server queues and submits a push through Expo.

Without these Firebase credentials, the APK supports local demo notifications and foreground polling but **does not receive remote Android push**. The server retries transport/ticket errors, but does not yet process Expo delivery receipts. Ticket acceptance is not confirmation that the phone displayed the notification.

Foreground feed polling targets 30 seconds; there is no hard one-minute guarantee while suspended/offline/force-stopped. Background sync and push delivery are governed by connectivity and Android.

## Tracking

Balanced GPS accuracy; 100-metre distance interval; approximately 60-second Android interval; shift-visible foreground service. Drivers explicitly grant permissions. End Shift stops the service. Force-stop and some OEM battery restrictions can stop tracking. Physical-device battery endurance and background recovery must be measured before fleet rollout.

Map tiles require connectivity; previously cached delivery addresses/coordinates remain available offline. The map displays geographic destinations, not route optimisation or traffic-based ETAs; dispatch can supply/update an ISO-8601 `eta` on assignments, and navigation apps calculate live travel time. Respect OpenStreetMap's tile policy and choose a contracted tile provider for fleet-scale deployment.

## Offline behaviour and conflicts

- Every delivery mutation is saved before the UI reports success.
- Mutation IDs are idempotent on the server, including after a lost HTTP response or server restart.
- Account+server-scoped caches prevent one driver seeing another's locally saved work.
- Proof uses durable app files, not temporary camera paths.
- A conflict keeps that delivery's queued work and displays a dispatch-contact message; unrelated deliveries and new offers continue syncing.
- Sign-out retains unsynced work for the same account. Uninstalling or clearing app storage deletes it.
- End a shift online when possible so dispatch immediately receives the ending state.

## Android builds

```sh
cd mobile
npx eas-cli@latest build --platform android --profile preview
```

`preview` produces an internally distributed, signed APK. `production` produces an AAB. EAS owns the project's Android signing credentials; preserve them for updates. `app.config.ts` is the native configuration source; Android/iOS project files are generated.

No live server or Firebase credentials are embedded in the demo APK.
