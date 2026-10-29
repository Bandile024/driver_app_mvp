# Native release acceptance

Run against the signed APK in `deliverables/`. This is a test procedure, not a claim that the checks have passed. Record actual results in `QA.md`.

## Package
1. Run `JAVA_HOME="<JDK 17 home>" python3 scripts/verify-apk.py deliverables/eskort-driver-1.0.0.apk`.
2. Confirm package `za.co.eskort.driver`, release flags, signature and ZIP alignment. Keep the generated SHA-256 and verification files with the APK.
3. Install on the test emulator with `adb -s emulator-5554 install -r <apk>`.
4. Launch without Metro. Verify fonts, logo, spacing, readable controls, navigation and absence of startup crashes.

## Demo delivery
1. Explore the demo, start a shift, open an offer and accept.
2. Check destination map, customer/store contact actions, delivery window, package count and ETA fallback.
3. Add an order note; navigate away and confirm it persists.
4. Advance to en route and arrived. Attempt completion without proof and confirm validation.
5. Capture a camera photo, enter a recipient, draw a signature, record GPS or its exception reason.
6. Leave and reopen proof; confirm the draft remains.
7. Disable emulator network, complete the delivery and inspect its history/proof.
8. Restart the app; confirm saved session, notes, completion and image/signature remain.
9. Re-enable the emulator's previous network settings.

## Branches and settings
- Decline a separate offer with a reason; confirm Declined history.
- Fail an accepted delivery with a reason; confirm Failed history.
- Exercise successful/failed/date filters and empty results.
- Edit profile, choose a photo, toggle dark mode and restart.
- Enable notifications and simulate an offer; inspect the local notification and its delivery link.
- End the shift; confirm the displayed state.
- Sign out and re-enter demo; confirm persistent demo history.

## Connected environment
Requires an HTTPS dispatch deployment and test driver account. Remote notifications additionally require Firebase configuration and a matching rebuilt APK.
- Register; log in by email and phone; restart to confirm session.
- Assign an order while the app is foregrounded. Measure its arrival against the 30-second polling interval and one-minute target.
- Update instructions/ETA and trigger escalation.
- Complete offline, then reconnect. Confirm server proof/notes, outbox drain and duplicate-safe retry.
- Grant location permission and start a real test shift. Confirm server GPS updates and their cessation after End Shift.
- Confirm remote push display and tap routing on a configured physical phone.

## Specification interpretation
- Native background work uses Expo tasks/Android WorkManager; browser service workers are not part of the Android app.
- Dispatch supplies ETA; Google Maps/Waze supplies live routing/travel time.
- Customer/store communication uses external phone, SMS and email applications.
- No hard one-minute guarantee exists while offline, suspended or force-stopped.
- Shift time is recorded on-device; it is not a moving-vehicle measurement.
- Physical camera usability, battery endurance, GPS accuracy and OEM background behavior require fleet-device testing.
