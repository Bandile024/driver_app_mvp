# Specification coverage

This maps all ten sections of `spec.txt` to the delivered implementation. Implementation coverage is separate from verification: see `QA.md` for actual results and `NATIVE-QA.md` for device acceptance steps.

| Specification | Implementation | Qualification |
| --- | --- | --- |
| 1. Authentication | `mobile/src/app/login.tsx`, `core/api.ts`, `core/storage.ts`, reference API in `server/`: registration, email/phone + password, JWT and native SecureStore session. | Real accounts require an HTTPS dispatch deployment. Optional OTP is not implemented. Demo entry is explicit. |
| 2. Dashboard | `(tabs)/index.tsx`, `components/ui.tsx`: customer, address, dispatch ETA or pending fallback, package count, status, shift control. | Active statuses distinguish accepted, en route and arrived. Live GPS requires permissions and a connected real account; demo never shares location. |
| 3. Delivery details | `order/[id].tsx`, `core/contact.ts`: instructions, dispatch notes, window, map, Google Maps/Waze, delivery/failure actions and customer/store contact. | Phone/SMS/email use external handlers. Real contact details are supplied by dispatch. |
| 4. Proof | `proof/[id].tsx`, `components/Signature.tsx`: camera, notes, recipient, handwritten signature, timestamp and GPS stamp. | Explicit exception reason required when GPS is unavailable. Native camera/signature workflow still needs device acceptance. |
| 5. Offline | `core/storage.ts`, `core/sync.ts`, `core/runtime.ts`: cached assignments, durable files/drafts, serialized writes, idempotent outbox and reconnect sync. | Native Expo tasks/Android WorkManager replace browser service workers. Background sync is OS-controlled, minimum 15-minute interval. |
| 6. Push | `core/runtime.ts`, `core/store.tsx`, server push queue: new assignment, instruction updates and escalations. | Remote Android push requires Firebase configuration, EAS FCM v1 credentials and a rebuilt APK. Current APK has local demo notification support and foreground polling. Server retries transport/ticket failures, not Expo delivery receipts. |
| 7. GPS | `core/runtime.ts`, `(tabs)/route.tsx`, `components/DeliveryMap.tsx`: shift-bound background tracking, measured location and geographic destination pins. | Balanced accuracy, distance threshold and approximate Android time interval reduce battery use. Fleet battery/GPS/OEM behavior is unverified. Maps are not route optimisation. |
| 8. History | `(tabs)/history.tsx`, `order/[id].tsx`: successful/failed/declined records, date/status filters, proof and timestamps. | Automated domain/persistence checks pass; full native history interaction remains unverified. |
| 9. Profile | `(tabs)/profile.tsx`: details/photo editing, delivered-today count, on-time-today percentage, notifications and dark mode. | “Time on shift” totals shifts recorded on this device; it does not measure moving-vehicle “time on road.” |
| 10. Errors/support | `reason/[id].tsx`, `support.tsx`, shared async buttons, sync conflict reporting: delivery issues, reasons, notes and dispatch contact. | Support is via external phone/email/SMS; there is no in-app chat or automated callback scheduling. |

## Additional requested behavior

- Explicit offer acceptance/decline with a reason.
- Foreground assignment polling every 30 seconds targets the requested one-minute update window. No hard one-minute guarantee is claimed while suspended, force-stopped or offline; live timing still needs measurement against the deployment.
- Eskort frontend assets, Spaza/Montserrat typography, cream/gold/navy palette and native component styling adapted from the supplied frontend. See `DESIGN.md`.
- A runnable Node 24 + SQLite reference dispatch API and admin CLI are included. This does not supply an existing Eskort commerce integration or store-admin web dashboard.
- Signed Android APK, checksum and verification records are in `deliverables/`. See `README.md` for installation, demo use, backend deployment and push setup.
