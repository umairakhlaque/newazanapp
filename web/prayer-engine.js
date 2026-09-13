(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.PrayerEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const PRAYERS = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
  const LABELS = { fajr: "FAJR", dhuhr: "DHUHR", asr: "ASR", maghrib: "MAGHRIB", isha: "ISHA" };
  const ADHAN_SCREEN_SECONDS = 60;
  const IQAMAH_COUNTDOWN_SECONDS = 120;
  const QUIET_AFTER_IQAMAH_SECONDS = 15 * 60;

  function localStamp(date, time = "00:00", seconds = 0) {
    const [year, month, day] = date.split("-").map(Number);
    const [hour, minute] = time.split(":").map(Number);
    return Date.UTC(year, month - 1, day, hour, minute, seconds);
  }

  function addDays(date, amount) {
    const value = new Date(localStamp(date));
    value.setUTCDate(value.getUTCDate() + amount);
    return value.toISOString().slice(0, 10);
  }

  function nowStamp(parts) {
    return localStamp(parts.date, `${parts.hour}:${parts.minute}`, Number(parts.second || 0));
  }

  function occurrences(days) {
    return days.flatMap((day) => PRAYERS.map((name) => ({
      name,
      label: LABELS[name],
      date: day.date,
      adhanText: day[name].adhan,
      iqamahText: day[name].iqamah,
      adhan: localStamp(day.date, day[name].adhan),
      iqamah: localStamp(day.date, day[name].iqamah),
    }))).sort((a, b) => a.iqamah - b.iqamah);
  }

  function eligibleContent(content, date) {
    return content.filter((item) => item.date === "*" || item.date === date);
  }

  function buildRows(current, all) {
    const nextIqamah = all.filter((item) => current < item.iqamah).sort((a, b) => a.iqamah - b.iqamah)[0];
    return PRAYERS.map((name) => {
      const next = all.filter((item) => item.name === name && current < item.iqamah).sort((a, b) => a.iqamah - b.iqamah)[0];
      return {
        name,
        label: LABELS[name],
        adhan: next?.adhanText || "--:--",
        iqamah: next?.iqamahText || "--:--",
        date: next?.date || null,
        isTomorrow: Boolean(next && next.date > new Date(current).toISOString().slice(0, 10)),
        isNext: Boolean(next && nextIqamah && next.name === nextIqamah.name && next.date === nextIqamah.date),
      };
    });
  }

  function evaluate(parts, payload) {
    if (!payload?.prayer_days?.length) return { type: "loading" };
    const current = nowStamp(parts);
    const all = occurrences(payload.prayer_days);

    // Adhan takes precedence where Maghrib Iqamah is only two minutes later,
    // ensuring the one-minute Adhan notice is still visible.
    const adhan = all.find((item) => current >= item.adhan && current < item.adhan + ADHAN_SCREEN_SECONDS * 1000);
    if (adhan) return { type: "adhan", prayer: adhan.label, time: adhan.adhanText };

    const countdown = all.find((item) => current >= item.iqamah - IQAMAH_COUNTDOWN_SECONDS * 1000 && current < item.iqamah);
    if (countdown) {
      return {
        type: "iqamah",
        prayer: countdown.label,
        secondsRemaining: Math.max(0, Math.ceil((countdown.iqamah - current) / 1000)),
      };
    }

    const quiet = all.some((item) => current >= item.iqamah - IQAMAH_COUNTDOWN_SECONDS * 1000 && current < item.iqamah + QUIET_AFTER_IQAMAH_SECONDS * 1000);
    const minute = Number(parts.minute);
    const second = Number(parts.second || 0);
    const contentMoment = minute % 5 === 0 && second < 30;
    if (!quiet && contentMoment) {
      const items = eligibleContent(payload.content || [], parts.date);
      if (items.length) {
        const secondsOfDay = Number(parts.hour) * 3600 + minute * 60 + second;
        return { type: "content", item: items[Math.floor(secondsOfDay / 300) % items.length] };
      }
    }

    return { type: "main", rows: buildRows(current, all) };
  }

  return { PRAYERS, LABELS, addDays, evaluate, localStamp, occurrences };
});
