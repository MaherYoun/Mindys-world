# Mindy's World

An original travel story game for web, iPhone and Android. Begin with a rotating Earth, select a country and city, then walk through its fantasy guild district to collect sunflower petals. Make companions and diary pages for each stop. One account carries those pages, companions, visited places and story progress between devices. The game works as a guest and keeps an offline copy. This repository includes source, database schema, web deployment workflow and native packaging setup. Signed store binaries require your developer accounts and signing tools.

## Try it in Visual Studio Code or Visual Studio

1. Unzip this project and open the `mindys-world` folder.
2. Start a local web server in the project folder:

   ```bash
   python -m http.server 8080 --directory www
   ```

3. Open `http://localhost:8080` in a browser. (On Windows, `py -m http.server 8080 --directory www` may be the available command.)

The game is plain HTML, CSS, and JavaScript. No Python packages or build step are required. Avoid opening `index.html` directly as a `file:` URL: the service worker and some app features need a local server.

## What is playable

- Begin on a draggable textured Earth with an animated halo, luminous orbit rings and gentle spin after release. Drag the globe down to move its visible surface down, or drag up to move it up, including over the poles. Use the mouse wheel, pinch, or +/− buttons to zoom close to the surface. Its day, twilight and night shading is calculated from the device's current clock and date. No GPS or location permission is used. Choose countries and cities from glowing globe markers or the searchable right-hand list. The list is the accessible way to select crowded markers. Custom countries use an approximate regional marker, and most city markers are approximate; these pins are for game navigation, not GPS directions.
- Walk through a real-time, stylized 3D guild district in closer third-person view at every stop. The player and companion swing their arms and legs as they walk; facial features turn with the body and the head eases into its direction. The arrival path has sunflower borders, orange trees, glowing paving, a journey gallery, luminous buildings, a portal, flower shrines, a guild hall, a diary pavilion, a companion nook, and a local radar. Each region changes the colours and scenery.
- Use the original, looping adventure soundtrack with the persistent **Music on/off** button. Browsers only begin sound after an interaction. Open the route index to pan and zoom a less detailed, illustrated game map with the real outline of Earth's continents and glowing destination pins. Search the 173 curated stops, or add a new place from the globe panel. The Earth map and pins are for game navigation, not GPS directions.
- Open **What-If Lantern** from the top bar when thoughts feel crowded. Naming a worry is optional. Notice one thing you see, hear, and feel, then choose a small step or let the thought rest. There is no score or timer. The thought stays out of storage unless you explicitly save the finished moment into the current city's diary. It is a gentle game activity, not medical care.
- Approach three glowing flower shrines and press **E** or **Explore** to collect their petals, then choose how the chapter continues. Twelve stops have a custom written scene; the others use the common chapter.
- On a computer use **W** or **Z** for forward, **S** for back, **Q** or the left arrow for left, **D** for right, and hold **A** while moving to run. Shift also runs. The printed letter works on QWERTY and AZERTY keyboards. Drag to turn the camera, and press **M** for the map. On a phone use the virtual joystick, hold **A Run** to move faster, drag on the scene to turn, and tap **Explore** near an object.
- Customize Mindy herself once for every city: skin tone, hair color and style, eyes, outfit, accessory and build. Her appearance is saved locally, included in backups and synced with her account. Older saves keep their progress and start with the default Mindy look.
- Customize a separate companion at every stop: name, personality, skin tone, hair, eyes, outfit, and accessory. The options are independent of country.
- Mark places visited. Write, edit, or delete multiple diary pages per place.
- Visit the glowing journey gallery in the world, or open **See my journeys** beside the companion, to see only the places actually marked visited and their diary page counts. Open a place from the gallery or return to the full world map.
- Sign in with the same email and password on web, iPhone and Android to sync diary pages, companions and progress. Offline changes are queued until reconnecting. Guest play stays on the current device.
- Export/import a JSON backup in Settings. If two devices edit the **same diary page** at the same time, the last upload wins; different pages sync independently.
- Install as a Progressive Web App from a supported browser after serving the project over HTTPS, or use Capacitor to build an Android or iOS app. WebGL is required for the textured globe and 3D district; if it is unavailable, the country/city list and illustrated story scene remain playable.

The attached travel plan has changing and tentative stops. The game does not claim she has visited a place simply because it appears in the plan. The future route has no fixed dates, reservations, budgets, medical notes or contacts. The worlds are original stylized fantasy districts generated from place and region names, not replicas of real cities or a GTA-sized open world. This playable WebGL prototype has third-person controls and richer scenery, but does not have PUBG-level character models, materials, animation, or a large open world. That fidelity needs a separate production phase with original 3D art, rigging, lighting, level design and real-device performance work; see `GRAPHICS_PRODUCTION.md` for the concrete brief. A small birthday message appears on February 14, without publishing her birth year. Earth textures came from the user-supplied `59-earth.zip` and were resized for mobile; verify that you have permission to redistribute those textures before a public store release. The music is generated from `tools/make_music.py` for this project.

## Set up cross-device sync

1. Create a [Supabase](https://supabase.com/) project in your account. Choose the region where you want her diary data hosted.
2. In **SQL Editor**, paste and run `supabase/schema.sql` once. This creates user-owned records, Row Level Security policies and an account deletion function.
3. In **Project Settings → API Keys**, copy the project URL and **publishable key** (or legacy anon key). Edit `www/config.js` with those values. Never put a secret or service_role key in this app.
4. Replace `siteUrl` in `www/config.js` with your final website URL ending in `/`, such as `https://yourname.github.io/mindys-world/`.
5. In **Authentication → URL Configuration**, set Site URL to the public `index.html`, and add public `index.html` and `reset.html` as allowed redirect URLs. Email confirmation opens in a browser, after which she signs in on each device. Password reset opens the hosted `reset.html` page.
6. Leave email/password authentication and email confirmations enabled. Configure [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp) with an email provider and verify the sending domain. Supabase's default sender is intended for testing and may refuse to send to addresses outside your project's team. Test signup and password reset using an external test email before inviting her.

The app can be played without a Supabase project, but account sync stays disabled until these values and services are configured. Local progress is uploaded at first sign-in. Use the same account on both phones and the web.

## Put the web version online with GitHub Pages

1. Create a public repository called `mindys-world` under your GitHub account. Open the extracted `mindys-world` folder in Visual Studio Code, then use its terminal. The repository should contain `www`, `.github`, `supabase`, the README and other project files at its root. Do not upload the original travel document or exported diary backups.
2. Run `git init`, `git add .`, `git commit -m "Publish Mindy's World"`, `git branch -M main`, `git remote add origin https://github.com/YOUR_USERNAME/mindys-world.git`, and `git push -u origin main`. Replace `YOUR_USERNAME` and authenticate in your own GitHub account when prompted. If this folder is already connected to a repository, commit and push its changes instead of adding another remote.
3. In that repository, go to **Settings → Pages → Build and deployment → Source** and select **GitHub Actions**. The included workflow publishes the `www` folder after a push to `main`. If the first run happened before Pages was enabled, open **Actions → Publish web game → Run workflow** to deploy it. Once the run succeeds, open `https://YOUR_USERNAME.github.io/mindys-world/` and share that URL with Mindy. She can open it from anywhere; the website does not require a store download.
4. Test the link on her browser. To share progress between her devices, first set up Supabase as described above and set `siteUrl` in `www/config.js` to that exact live URL, then commit and push again. Fill every **REPLACE WITH** field in `www/privacy.html` with your real developer name, contact email, publication date and Supabase hosting region before inviting accounts.

GitHub Pages serves a public website, so keep anything private out of the committed files. Guest play works before cloud setup, but its diary and appearance stay in that browser. The diary syncs only to the signed-in user's protected Supabase records after setup; it is not uploaded to GitHub.

## Android app package

Install Node.js and Android Studio on your computer, then run in the project folder:

```bash
npm install
npx cap add android
npx cap sync android
npx cap open android
```

Change `appId` in `capacitor.config.json` to a unique permanent ID you control **before** creating the store listing. Open and test the project in Android Studio. After editing web files, run `npx cap sync android` again. To publish, generate a signed **Android App Bundle** and keep its upload key safe.

## iPhone app package

On a Mac with Xcode installed:

```bash
npm install
npx cap add ios
npx cap sync ios
npx cap open ios
```

The iOS build requires a Mac, Xcode and an Apple Developer Program membership. Test on an iPhone, then archive in Xcode and upload through App Store Connect. The installable web version can be shared while store submissions are reviewed.

## Store submission and account deletion

See `STORE_RELEASE.md` for listing copy and the exact tasks in your Apple and Google accounts. You must enroll, verify identity, accept their agreements, pay the fees, provide accurate privacy forms and screenshots, sign and upload the native builds, and submit them for review. New Google Play personal accounts may require a closed test before production access. Approval is decided by each store.

The in-app **Journey settings → Delete account** action and the external `delete-account.html` page permanently remove a signed-in account and its synced game data. Put the public deletion URL and `privacy.html` URL in the store forms. A downloaded JSON backup remains under its owner's control.

## Where to edit

- `www/data.js`: places and special story chapters.
- `www/app.js`: globe-to-city flow, illustrated map navigation, What-If Lantern, music control, game rules, companion builder, diary and backup. It deliberately retains the older `sunflower-atlas-v1` local storage key so existing players do not lose their progress after this rename.
- `www/globe.js`, `www/globe.css`, `www/assets`: WebGL globe, geographic destination pins, day/night shader, responsive globe screen, high-resolution Earth texture with a smaller mobile fallback, illustrated game map, and music. The map uses equirectangular coordinates to place pins on the real continent shapes.
- `tools/make_game_map.py`: rebuilds the illustrated game map from the supplied Earth archive; `tools/make_store_graphic.py` draws the Mindy's World store feature graphic. These source scripts are optional and the generated assets are included.
- `www/world3d.js` and `www/world.css`: 3D world, third-person controls, landmark interactions and responsive game HUD.
- `www/cloud.js` and `www/config.js`: sign-in, offline queue and sync.
- `supabase/schema.sql`: account-owned tables, access rules and deletion.
- `www/privacy.html`, `delete-account.html`, `reset.html`: public privacy and account pages.
- `www/styles.css` and `www/mind.css`: visual design, phone layout and the Lantern.
- `www/index.html`: screen structure and dialogs.

The game uses an original fantasy guild and anime-inspired visual language with no Fairy Tail characters, logos, or music. The diary is text-only. Keep the Supabase project, SMTP provider, website and developer memberships active for continued use. Keep SMTP passwords, Apple signing assets and Android upload keys out of GitHub.
