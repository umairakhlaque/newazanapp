# SIEA Prayer Display

Offline-first Android TV prayer and Iqamah display for SIEA.

## Production web display and administration

GitHub Pages publishes the production TV display from `web/`. It follows the prayer timetable automatically, can be installed as a full-screen PWA, and retains the last valid timetable for offline operation. Add `?demo=1` to the display URL to reveal preview controls for the Main, Adhan, Iqamah, Ayah, Hadith, and scholar screens. The `/admin.html` page accepts XLS, XLSX, or CSV files for prayer times and monthly Islamic content, supports manual daily editing, validates the data, and sends the administrator to GitHub to publish the approved CSV. GitHub remains the authenticated publishing and audit layer; no access token is stored in the browser.

The current admin sign-in is intentionally temporary client-side protection for testing. Because this is a public repository and a static GitHub Pages site, it must not be treated as secure access control. Replace it with Cloudflare Access before wider operational use.

## What the MVP does

- Permanent SIEA screen with an analogue clock and five prayer rows.
- Large Gregorian and Umm al-Qura Hijri dates beneath the clock, with a moon phase matched to the Hijri day.
- Separate Adhan and Iqamah columns.
- One-minute full-screen Adhan notification at the exact Adhan time.
- Full-screen two-minute Iqamah countdown with a pulsing mobile-silencing reminder.
- Rolls both Adhan and Iqamah to tomorrow immediately when today's Iqamah begins.
- Shows a Qur'anic ayah, Hadith, or approved scholar statement for 30 seconds every five minutes.
- Suppresses educational content from two minutes before Iqamah until fifteen minutes afterwards.
- Stores the timetable and content in Room/SQLite, so the display continues without internet.
- Checks a small GitHub version file daily and downloads the full payload only when it changes.

## Repository layout

```text
app/                    Native Kotlin/Jetpack Compose Android TV app
data/timetable.csv      Editable prayer timetable
data/content.csv        Editable daily Islamic content
data/payload.json       Generated synchronization payload
data/version.json       Generated version marker
scripts/build_payload.py CSV validator and JSON generator
.github/workflows/      Data validation, tests, APK builds and releases
```

## Update prayer times through GitHub

1. Open `data/timetable.csv` on GitHub.
2. Select the pencil icon to edit it, or upload a replacement CSV with the same headers.
3. Add at least seven future days. An entire year is recommended.
4. Commit the change to `main`.
5. The **Validate and Publish Timetable** workflow validates every date/time and publishes new JSON.
6. Installed Android boxes detect the new version during their daily check.

Time format must be 24-hour `HH:mm`. Date format must be `YYYY-MM-DD`.

## Update Ayat, Hadith and quotations

Open `/admin.html`, choose the month, and either edit each day or import the downloadable XLSX/CSV monthly template. Each day contains one Quran entry, one Hadith, and one word of wisdom. Validate the entire month, download the generated `content.csv`, and publish it through GitHub. Supported application types are `QURAN`, `HADITH`, and `SCHOLAR`.

- Set `date` to a specific `YYYY-MM-DD` date for one day.
- Set `date` to `*` to keep an item in the general rotation.
- Every item requires original text, English text, and a verified reference.
- Content should be checked by an authorised SIEA reviewer before publication.

## Build an APK

Every push runs unit tests and produces an installable debug APK:

1. Open the repository's **Actions** tab.
2. Open the latest **Build Android TV APK** run.
3. Download the `SIEA-Prayer-Display-debug` artifact.
4. Extract and install `app-debug.apk` on the Android TV box.

For a named downloadable release, create a tag such as `v0.1.0`; the release workflow publishes `SIEA-Prayer-Display.apk` under GitHub Releases.

## Android TV behaviour

The application keeps the screen awake, runs in immersive landscape mode, and advertises itself as an Android TV/Leanback application. Automatic opening after boot is requested, but some Android TV boxes block background activity launches. Those boxes should configure SIEA Prayer Display as the launcher or allow auto-start in their device settings.

## Current data status

The official SIEA timetable supplied for 1–30 September 2026 is published. Sunrise is excluded, and Maghrib Iqamah is set to two minutes after Maghrib Adhan. Publish October and later dates before the current timetable expires.
