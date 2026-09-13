const PAYLOAD_URL = "data/payload.json";
const CACHE_KEY = "siea-prayer-payload-v1";
const LONDON_ZONE = "Europe/London";
const engine = window.PrayerEngine;

let payload = null;
let renderedStateKey = "";
let demoState = null;
let toolsTimer = null;
let wakeLock = null;

function londonParts(date = new Date()) {
  const values = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    weekday: "long",
  }).formatToParts(date).map((part) => [part.type, part.value]));
  return { ...values, date: `${values.year}-${values.month}-${values.day}` };
}

function buildMarkers() {
  const host = document.getElementById("clock-markers");
  if (host.children.length) return;
  for (let index = 0; index < 60; index += 1) {
    const marker = document.createElement("i");
    marker.className = `marker ${index % 5 === 0 ? "major" : ""}`;
    marker.style.transform = `rotate(${index * 6}deg)`;
    host.appendChild(marker);
  }
}

function updateClock() {
  const now = new Date();
  const parts = londonParts(now);
  const hour = Number(parts.hour) % 12;
  const minute = Number(parts.minute);
  const second = Number(parts.second);
  document.getElementById("hour-hand").style.transform = `translateX(-50%) rotate(${hour * 30 + minute * 0.5}deg)`;
  document.getElementById("minute-hand").style.transform = `translateX(-50%) rotate(${minute * 6 + second * 0.1}deg)`;
  document.getElementById("second-hand").style.transform = `translateX(-50%) rotate(${second * 6}deg)`;
  document.getElementById("digital-clock").textContent = `${parts.hour}:${parts.minute}`;
  document.getElementById("current-date").textContent = new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);
  return parts;
}

function showScreen(name) {
  document.querySelectorAll(".screen").forEach((screen) => screen.classList.remove("active"));
  document.getElementById(`${name}-screen`).classList.add("active");
  document.getElementById("display").dataset.screen = name;
}

function renderRows(rows) {
  const host = document.getElementById("prayer-rows");
  host.innerHTML = rows.map((row) => `
    <div class="prayer-row ${row.isNext ? "next" : ""} ${row.isTomorrow ? "tomorrow" : ""}">
      <div class="prayer-name">
        ${row.label}
        <small class="row-label">${row.isTomorrow ? "TOMORROW" : row.isNext ? "NEXT IQAMAH" : "&nbsp;"}</small>
      </div>
      <span class="prayer-time">${row.adhan}</span>
      <span class="prayer-time">${row.iqamah}</span>
    </div>`).join("");
}

function contentHeading(item) {
  if (item.type === "QURAN") return "AYAH OF THE DAY";
  if (item.type === "HADITH") return "HADITH OF THE DAY";
  return "WORDS OF WISDOM";
}

function renderState(state) {
  const key = state.type === "iqamah"
    ? `${state.type}:${state.prayer}:${state.secondsRemaining}`
    : state.type === "content"
      ? `${state.type}:${state.item.id}`
      : state.type === "main"
        ? `${state.type}:${state.rows.map((row) => `${row.date}-${row.name}`).join("|")}`
        : `${state.type}:${state.prayer || ""}`;
  if (key === renderedStateKey) return;
  renderedStateKey = key;

  if (state.type === "loading") {
    showScreen("loading");
    return;
  }
  if (state.type === "main") {
    renderRows(state.rows);
    showScreen("main");
    return;
  }
  if (state.type === "adhan") {
    document.getElementById("adhan-prayer").textContent = state.prayer;
    document.getElementById("adhan-time").textContent = state.time;
    showScreen("adhan");
    return;
  }
  if (state.type === "iqamah") {
    document.getElementById("iqamah-prayer").textContent = state.prayer;
    const minutes = Math.floor(state.secondsRemaining / 60);
    const seconds = state.secondsRemaining % 60;
    document.getElementById("countdown").textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    showScreen("iqamah");
    return;
  }
  if (state.type === "content") {
    const item = state.item;
    document.getElementById("content-title").textContent = contentHeading(item);
    document.getElementById("content-arabic").textContent = item.arabic;
    document.getElementById("content-english").textContent = item.english;
    document.getElementById("content-reference").textContent = item.scholar
      ? `${item.reference} · ${item.scholar}`
      : item.reference;
    showScreen("content");
  }
}

function currentState(parts) {
  if (demoState && payload) {
    if (demoState === "main") return { type: "main", rows: engine.evaluate(parts, payload).rows || engine.evaluate({ ...parts, hour: "12", minute: "01", second: "00" }, payload).rows };
    if (demoState === "adhan") return { type: "adhan", prayer: "MAGHRIB", time: payload.prayer_days.find((day) => day.date === parts.date)?.maghrib?.adhan || "19:31" };
    if (demoState === "iqamah") return { type: "iqamah", prayer: "MAGHRIB", secondsRemaining: 98 };
    const item = payload.content.find((entry) => entry.type === demoState);
    if (item) return { type: "content", item };
  }
  return engine.evaluate(parts, payload);
}

function tick() {
  const parts = updateClock();
  renderState(payload ? currentState(parts) : { type: "loading" });
}

function setConnectionStatus(message, state) {
  const badge = document.getElementById("connection-status");
  badge.textContent = message;
  badge.dataset.state = state;
}

function updateDataPeriod() {
  if (!payload?.prayer_days?.length) return;
  const dates = payload.prayer_days.map((day) => day.date).sort();
  const first = dates[0];
  const last = dates.at(-1);
  document.getElementById("data-period").textContent = `Timetable ${first} — ${last}`;
  const today = londonParts().date;
  if (today > last) setConnectionStatus("TIMETABLE UPDATE REQUIRED", "warning");
}

async function loadPayload() {
  try {
    const response = await fetch(`${PAYLOAD_URL}?t=${Date.now()}`, { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const latest = await response.json();
    if (!latest?.prayer_days?.length) throw new Error("Timetable is empty");
    payload = latest;
    localStorage.setItem(CACHE_KEY, JSON.stringify(latest));
    document.getElementById("mosque-name").textContent = latest.mosque_name || "SIEA";
    setConnectionStatus("TIMETABLE UPDATED", "online");
  } catch (error) {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      payload = JSON.parse(cached);
      setConnectionStatus("OFFLINE · SAVED TIMETABLE", "offline");
    } else {
      document.getElementById("loading-message").textContent = "Timetable unavailable. Please check the internet connection and reload.";
      setConnectionStatus("NO TIMETABLE AVAILABLE", "warning");
      return;
    }
  }
  updateDataPeriod();
  renderedStateKey = "";
  tick();
}

async function requestWakeLock() {
  if (!("wakeLock" in navigator)) return;
  try { wakeLock = await navigator.wakeLock.request("screen"); } catch (_) { /* Device may not support it. */ }
}

function revealTools() {
  const tools = document.getElementById("display-tools");
  tools.classList.add("visible");
  document.body.classList.remove("cursor-hidden");
  clearTimeout(toolsTimer);
  toolsTimer = setTimeout(() => {
    tools.classList.remove("visible");
    document.body.classList.add("cursor-hidden");
  }, 7000);
}

function setupControls() {
  const fullScreen = document.getElementById("fullscreen-button");
  fullScreen.addEventListener("click", async () => {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
    else await document.exitFullscreen?.();
    await requestWakeLock();
  });
  document.addEventListener("fullscreenchange", () => {
    fullScreen.textContent = document.fullscreenElement ? "EXIT FULL SCREEN" : "FULL SCREEN";
  });
  ["mousemove", "pointerdown", "keydown", "touchstart"].forEach((eventName) => document.addEventListener(eventName, revealTools, { passive: true }));
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && wakeLock) requestWakeLock(); });

  const params = new URLSearchParams(location.search);
  if (params.get("demo") === "1") {
    const controls = document.getElementById("demo-controls");
    controls.hidden = false;
    controls.addEventListener("click", (event) => {
      const value = event.target.dataset.demo;
      if (!value) return;
      demoState = value === "auto" ? null : value;
      renderedStateKey = "";
      tick();
    });
  }
}

async function initialise() {
  buildMarkers();
  setupControls();
  tick();
  setInterval(tick, 1000);
  await loadPayload();
  setInterval(loadPayload, 6 * 60 * 60 * 1000);
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  revealTools();
}

initialise();
