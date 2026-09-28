# Store release handoff

## Proposed listing

**Name:** Mindy's World

**Short description:** A gentle travel adventure with companions and a private diary.

**Description:** Turn a glowing Earth, choose a country and a city, and step into a sunflower-lit fantasy guild world at every stop on your journey. Walk or run past sunflowers and orange trees in a stylized 3D district, choose Mindy's look, gather flowers, see your visited places in the journey gallery, choose how a short story continues, design a companion for every place, and keep your own travel diary. Add stops, zoom around an illustrated world map, play with the original adventure soundtrack or turn it off, and return whenever you like. The What-If Lantern offers a quiet game moment to notice your surroundings and choose a small step. It saves words only when you decide to keep them in the diary. An optional account syncs pages, appearances, companions and progress across the website, iPhone and Android. Play at your pace, with no streaks or deadlines.

Capture real release-build screenshots of the globe and country panel, illustrated map, 3D district and journey gallery, What-If Lantern, story scene, companion creator, diary and sync screen. Use the provided app icon and Mindy's World feature graphic. Store imagery should reflect the actual game and describe its current stylized rendering accurately. Confirm redistribution rights for the supplied Earth textures before submission.

## Tasks in your accounts

1. Create the Supabase project, run the SQL, set up custom SMTP and configure `www/config.js`. Test sign-up, email confirmation, password reset, two-device sync, offline recovery and account deletion with a test account.
2. Publish the GitHub Pages website. Fill the real name, contact, date and data region in the privacy page. Check the public privacy, reset and account deletion pages, and set Supabase's allowed redirect URLs to the final site.
3. Choose a permanent, unused app ID in `capacitor.config.json`, then generate and test the Android and iOS projects on real devices, including globe rendering, touch selection, the soundtrack, diary editing and offline recovery. Keep native signing credentials private.
4. Create and verify Apple Developer and Google Play Console accounts; complete payment and legal enrollment steps in those accounts.
5. In Play Console, complete target audience, content rating, Data safety and app access forms. Provide the website's privacy policy URL and `delete-account.html` as the external deletion URL. Upload a signed Android App Bundle. If yours is a new personal account, complete the required closed test before requesting production access.
6. In App Store Connect, create the iOS app record, add accurate privacy disclosures, screenshots and the privacy URL. Upload an Xcode archive, provide a reviewer demo account or guest access instructions, and submit for review.

**Privacy answers to check against the final build:** When signed in, email, diary text, companions, custom places and gameplay state are transmitted to Supabase for account and sync functions. This code has no ads, analytics, precise-location request, contacts, camera or photo upload. Answer store forms based on the services and SDKs you actually deploy.

**Review risk:** Approval is not automatic. Apple assesses minimum functionality, and either store may ask for changes or additional testing. The website can be shared while reviews run.

Official links: [Capacitor](https://capacitorjs.com/docs), [Apple review guidelines](https://developer.apple.com/app-store/review/guidelines/), [Apple account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/), [Google account deletion](https://support.google.com/googleplay/android-developer/answer/13327111), [Google closed testing](https://support.google.com/googleplay/android-developer/answer/14151465), [Android signing](https://developer.android.com/studio/publish/app-signing), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
