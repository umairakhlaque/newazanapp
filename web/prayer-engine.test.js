const test = require("node:test");
const assert = require("node:assert/strict");
const { evaluate } = require("./prayer-engine.js");

function day(date, offset = 0) {
  const shift = (text) => {
    const [hour, minute] = text.split(":").map(Number);
    const total = hour * 60 + minute + offset;
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  };
  return {
    date,
    fajr: { adhan: shift("05:04"), iqamah: shift("05:30") },
    dhuhr: { adhan: shift("13:08"), iqamah: shift("13:30") },
    asr: { adhan: shift("16:30"), iqamah: shift("18:15") },
    maghrib: { adhan: shift("19:31"), iqamah: shift("19:33") },
    isha: { adhan: shift("20:51"), iqamah: shift("21:15") },
  };
}

const payload = {
  prayer_days: [day("2026-09-13"), day("2026-09-14", 2)],
  content: [
    { id: "q1", date: "*", type: "QURAN", arabic: "آية", english: "Verse", reference: "2:153" },
    { id: "h1", date: "*", type: "HADITH", arabic: "حديث", english: "Hadith", reference: "1" },
  ],
};

const at = (hour, minute, second = 0) => ({ date: "2026-09-13", hour, minute, second });

test("main screen rolls a completed prayer to tomorrow", () => {
  const state = evaluate(at("10", "01"), payload);
  assert.equal(state.type, "main");
  assert.equal(state.rows[0].isTomorrow, true);
  assert.equal(state.rows[0].adhan, "05:06");
  assert.equal(state.rows[1].isNext, true);
});

test("shows Adhan for one minute", () => {
  const state = evaluate(at("13", "08", 30), payload);
  assert.deepEqual({ type: state.type, prayer: state.prayer, time: state.time }, { type: "adhan", prayer: "DHUHR", time: "13:08" });
});

test("shows the two-minute Iqamah countdown", () => {
  const state = evaluate(at("13", "28", 30), payload);
  assert.equal(state.type, "iqamah");
  assert.equal(state.prayer, "DHUHR");
  assert.equal(state.secondsRemaining, 90);
});

test("Adhan notice takes precedence at Maghrib", () => {
  assert.equal(evaluate(at("19", "31", 20), payload).type, "adhan");
  const countdown = evaluate(at("19", "32", 0), payload);
  assert.equal(countdown.type, "iqamah");
  assert.equal(countdown.secondsRemaining, 60);
});

test("rotates content for thirty seconds every five minutes", () => {
  assert.equal(evaluate(at("10", "05", 10), payload).type, "content");
  assert.equal(evaluate(at("10", "05", 35), payload).type, "main");
});

test("suppresses content for fifteen minutes after Iqamah", () => {
  assert.equal(evaluate(at("13", "35", 10), payload).type, "main");
  assert.equal(evaluate(at("13", "45", 10), payload).type, "content");
});
