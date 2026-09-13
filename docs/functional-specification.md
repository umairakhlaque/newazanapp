# SIEA Display Rules

## Main screen

The main screen is shown for most of the day. It contains the SIEA name, a large analogue clock with exact digital time, and Fajr, Dhuhr, Asr, Maghrib, and Isha rows. Each row displays the next upcoming Adhan and Iqamah for that prayer.

At the exact Iqamah instant, that prayer row switches to the following day's Adhan and Iqamah. A `TOMORROW` label identifies a rolled row.

## Screen priority

1. Iqamah countdown: from two minutes before Iqamah until Iqamah.
2. Adhan notification: from Adhan until one minute after Adhan.
3. Daily Islamic content: first 30 seconds of each five-minute interval.
4. Main screen.

Daily content is additionally suppressed from two minutes before Iqamah until fifteen minutes after Iqamah.

## Offline behaviour

The bundled payload seeds Room/SQLite on first launch. A daily connected worker checks `data/version.json`; `data/payload.json` is downloaded and atomically activated only when the version changes. A failed download or invalid payload leaves the last valid local timetable active.

## Timezone

All scheduling uses `Europe/London`, including daylight-saving transitions. The Android box system clock must remain accurate.
