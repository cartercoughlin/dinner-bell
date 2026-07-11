# Dinner Bell

Dinner Bell is a React, TypeScript, Vite, and Capacitor recipe app for saving recipes, planning meals, building grocery lists, and sharing a household recipe collection.

## What It Does

- Save recipes manually, from a URL, or from an uploaded header/photo reference.
- Store recipes, meal plans, and grocery state in Supabase.
- Restore a user's recipes across reinstalls by asking for an email identifier on first launch.
- Share a household through the Family Sharing sheet with a QR/deep-link invite.
- Plan meals on a calendar and generate grocery lists from planned recipes.
- Run as a web app during development and as an iOS app through Capacitor.

## Tech Stack

- React 18
- TypeScript
- Vite
- React Router
- Supabase
- Capacitor iOS
- FirebaseCore for iOS startup configuration
- CocoaPods for native iOS dependencies

## Setup

Install JavaScript dependencies:

```bash
npm install
```

Start the Vite dev server:

```bash
npm run dev
```

The app runs at `http://localhost:5173`.

## Project Links

- Firebase App Distribution: https://console.firebase.google.com/project/dinner-bell-be27b/appdistribution/app/ios:com.dinner-bell.app/releases
- Render dashboard: https://dashboard.render.com/web/srv-d856d7btqb8s73fp4n70

## Environment

The app has default Supabase values in `src/lib/supabase.ts`, but deployments can override them with:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_PUBLIC_APP_URL=
VITE_APP_URL_SCHEME=dinnerbell
```

Email login is intentionally lightweight: the email is normalized, hashed, and used as the app's stable `user_token`. It is not a secure authentication flow.

## iOS

The iOS app lives in `ios/App`.

Firebase is used for native iOS app registration and distribution readiness. The current app still stores recipe data in Supabase; Firebase is initialized at startup so Firebase services can be added without changing the native boot path later.

Firebase is initialized from the Capacitor UIKit app delegate:

```text
ios/App/App/AppDelegate.swift
```

Firebase configuration is bundled from:

```text
ios/App/App/GoogleService-Info.plist
```

Native dependencies are managed through CocoaPods in:

```text
ios/App/Podfile
```

The iOS bundle ID must match Firebase and Xcode:

```text
com.dinner-bell.app
```

After web or native dependency changes, sync Capacitor before building in Xcode:

```bash
npm run build:ios
```

Open the iOS project:

```bash
npm run cap:open
```

If CocoaPods or Xcode cache access fails from a sandboxed terminal, rerun the sync with normal local permissions.

## Firebase Setup

Use this when creating or reconnecting the Firebase project for Dinner Bell.

1. Open Firebase Console and go to the Dinner Bell project settings.
2. In `Your apps`, click `Add app`.
3. Choose the platform.
4. For iOS, enter the exact Xcode bundle ID: `com.dinner-bell.app`.
5. Add an app nickname if useful.
6. Finish registration and download `GoogleService-Info.plist`.
7. Place the file at:

```text
ios/App/App/GoogleService-Info.plist
```

8. Make sure the plist is included in the Xcode `App` target resources.
9. Run:

```bash
npm run build:ios
```

For Android later, register the Android package name in Firebase and add `google-services.json` to the Android app as Firebase instructs.

## Deploying Test Builds

Before any native test build:

```bash
npm run build:ios
npm run cap:open
```

In Xcode:

1. Select the `App` scheme.
2. Confirm the bundle ID is `com.dinner-bell.app`.
3. Confirm signing team and provisioning are valid.
4. Build and run on a physical device at least once.
5. Use `Product > Archive` for distributable builds.

### Firebase App Distribution

This is the simplest first path for sending an installable build to testers.

1. In Xcode, create an archive: `Product > Archive`.
2. In Organizer, choose `Distribute App`.
3. Choose `Ad Hoc` or `Development`.
4. Export an `.ipa`.
5. In Firebase Console, open `DevOps & Engagement > App Distribution`.
6. Select the Dinner Bell iOS app.
7. Choose `Distribute new release`.
8. Upload the `.ipa`.
9. Add tester emails or a tester group.
10. Add short release notes and distribute.

Firebase App Distribution link:

```text
https://console.firebase.google.com/project/dinner-bell-be27b/appdistribution/app/ios:com.dinner-bell.app/releases
```

Testers receive an email link from Firebase with install instructions.

Firebase CLI or fastlane can automate this later, but the console upload flow is the easiest first release path.

### TestFlight

Use TestFlight when you want Apple-hosted beta testing.

1. In Xcode, create an archive: `Product > Archive`.
2. In Organizer, choose `Distribute App`.
3. Choose `App Store Connect`.
4. Upload the build.
5. Open App Store Connect.
6. Select Dinner Bell.
7. Go to `TestFlight`.
8. Wait for the build to finish processing.
9. Add internal testers first.
10. For external testers, create a group, add tester emails, fill in beta review details, and submit for Beta App Review.

### App Store Connect Release

Use this path when preparing a production App Store submission.

1. Make sure app name, bundle ID, SKU, category, age rating, privacy details, screenshots, and support URL are filled in App Store Connect.
2. Archive and upload a release build from Xcode.
3. In App Store Connect, attach the processed build to the app version.
4. Fill in release notes and review information.
5. Confirm any required privacy nutrition labels and data collection answers.
6. Submit for App Review.

For each new production upload, increment the build number in Xcode before archiving.

## Scripts

- `npm run dev` - start the web dev server
- `npm run dev:server` - start the local recipe parser server
- `npm run dev:all` - start the parser server and web dev server
- `npm run build` - typecheck and build the web app
- `npm run build:ios` - build web assets and sync Capacitor iOS
- `npm run cap:sync` - sync Capacitor
- `npm run cap:open` - open the iOS project in Xcode
- `npm run lint` - run ESLint
- `npm run preview` - preview the production web build

## Project Structure

```text
dinner-bell/
├── ios/App/                 # Capacitor iOS project
├── public/                  # Static web assets and theme previews
├── recipes/                 # Python parsing helpers
├── server/                  # Local recipe parsing server
├── src/
│   ├── components/          # Reusable React components
│   ├── contexts/            # App state providers
│   ├── lib/                 # Supabase, parsing, image, and category helpers
│   ├── pages/               # Route-level pages
│   ├── themes/              # Theme files
│   ├── types/               # Shared TypeScript types
│   ├── utils/               # Utility functions
│   ├── App.tsx              # Router and app shell
│   └── index.css            # Global styles
├── capacitor.config.ts      # Capacitor app config
├── package.json
└── README.md
```

## Notes

- Use `npm run build:ios` before testing a fresh build in Xcode.
- The Family Sharing sheet includes the current email account and lets the user edit it.
- The app uses `dinnerbell://join/:token` for native invite deep links.
- `codeindex.json`, `symbolindex.json`, and generated SwiftPM workspace files are not required app source.
