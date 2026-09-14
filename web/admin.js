const TIMETABLE_HEADERS = ["date","fajr_adhan","fajr_iqamah","dhuhr_adhan","dhuhr_iqamah","asr_adhan","asr_iqamah","maghrib_adhan","maghrib_iqamah","isha_adhan","isha_iqamah"];
const CONTENT_HEADERS = ["date","quran_arabic","quran_translation","quran_verse","quran_detail","hadith_arabic","hadith_english","hadith_reference","wisdom_arabic","wisdom_english","wisdom_reference"];
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const LOGIN_HASH = "40f17004b4f44bcbf1c0ded8ed07530ce4cde37b52117661d3fb466fdd42bb59";
const SESSION_KEY = "siea-admin-session";

let timetableRecords = [];
let contentRecords = new Map();
let selectedMonth = "";
let failedLogins = 0;
let loginBlockedUntil = 0;

function normaliseHeader(value) {
  return String(value || "").trim().toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index], next = text[index + 1];
    if (character === '"' && quoted && next === '"') { cell += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = []; cell = "";
    } else cell += character;
  }
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

async function readTabularFile(file) {
  if (file.name.toLowerCase().endsWith(".csv")) return parseCsv(await file.text());
  if (!window.XLSX) throw new Error("Excel reader could not load. Check the internet connection or export the file as CSV.");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, dateNF: "yyyy-mm-dd", defval: "" });
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function matrixToCsv(matrix) {
  return matrix.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

function downloadFile(name, content, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
}

function showAdmin() {
  document.getElementById("login-panel").hidden = true;
  document.getElementById("admin-panel").hidden = false;
  initialiseMonth();
}

function showLogin() {
  document.getElementById("admin-panel").hidden = true;
  document.getElementById("login-panel").hidden = false;
}

document.getElementById("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = document.getElementById("login-message");
  if (Date.now() < loginBlockedUntil) {
    message.className = "status error";
    message.textContent = "Too many attempts. Please wait 30 seconds.";
    return;
  }
  const username = document.getElementById("admin-username").value.trim();
  const password = document.getElementById("admin-password").value;
  const valid = await sha256(`${username}:${password}`) === LOGIN_HASH;
  if (valid) {
    failedLogins = 0;
    sessionStorage.setItem(SESSION_KEY, "active");
    showAdmin();
  } else {
    failedLogins += 1;
    if (failedLogins >= 5) loginBlockedUntil = Date.now() + 30000;
    message.className = "status error";
    message.textContent = "Incorrect username or password.";
  }
});

document.getElementById("logout-button").addEventListener("click", () => {
  sessionStorage.removeItem(SESSION_KEY);
  document.getElementById("admin-password").value = "";
  showLogin();
});

function recordsFromMatrix(matrix, requiredHeaders) {
  if (matrix.length < 2) throw new Error("The file contains no data rows.");
  const headers = matrix[0].map(normaliseHeader);
  const missing = requiredHeaders.filter((header) => !headers.includes(header));
  if (missing.length) throw new Error(`Missing columns: ${missing.join(", ")}`);
  return matrix.slice(1)
    .filter((values) => values.some((value) => String(value).trim()))
    .map((values) => Object.fromEntries(headers.map((header, index) => [header, String(values[index] ?? "").trim()])));
}

function validateTimetableMatrix(matrix) {
  const records = recordsFromMatrix(matrix, TIMETABLE_HEADERS);
  const seen = new Set();
  records.forEach((record, index) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(record.date) || Number.isNaN(Date.parse(`${record.date}T00:00:00Z`))) throw new Error(`Invalid date on row ${index + 2}. Use YYYY-MM-DD.`);
    if (seen.has(record.date)) throw new Error(`Duplicate date ${record.date}.`);
    seen.add(record.date);
    TIMETABLE_HEADERS.slice(1).forEach((header) => {
      if (!TIME_PATTERN.test(record[header])) throw new Error(`Invalid ${header} on ${record.date}. Use HH:MM.`);
    });
  });
  if (records.length < 7) throw new Error("Please provide at least seven days of timings.");
  return records.sort((a, b) => a.date.localeCompare(b.date));
}

function prayerPair(record, name) { return `${record[`${name}_adhan`]} / ${record[`${name}_iqamah`]}`; }

function renderTimetable(records) {
  document.getElementById("preview-summary").textContent = `${records.length} days validated: ${records[0].date} to ${records.at(-1).date}. Times show Adhan / Iqamah.`;
  document.getElementById("preview-body").innerHTML = records.slice(0, 31).map((record) => `<tr><td>${record.date}</td><td>${prayerPair(record,"fajr")}</td><td>${prayerPair(record,"dhuhr")}</td><td>${prayerPair(record,"asr")}</td><td>${prayerPair(record,"maghrib")}</td><td>${prayerPair(record,"isha")}</td></tr>`).join("");
}

document.getElementById("timetable-file").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  const message = document.getElementById("validation-message");
  const download = document.getElementById("download-timetable");
  const publish = document.getElementById("publish-link");
  download.disabled = true; download.classList.add("disabled"); publish.classList.add("disabled");
  if (!file) return;
  try {
    timetableRecords = validateTimetableMatrix(await readTabularFile(file));
    renderTimetable(timetableRecords);
    message.className = "status success";
    message.textContent = `Validated successfully: ${file.name}.`;
    download.disabled = false; download.classList.remove("disabled"); publish.classList.remove("disabled");
  } catch (error) {
    message.className = "status error";
    message.textContent = error.message;
    document.getElementById("preview-body").innerHTML = '<tr><td colspan="6">Validation failed</td></tr>';
  }
});

document.getElementById("download-timetable").addEventListener("click", () => {
  downloadFile("timetable.csv", matrixToCsv([TIMETABLE_HEADERS, ...timetableRecords.map((record) => TIMETABLE_HEADERS.map((header) => record[header]))]));
});

function datesForMonth(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  const count = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return Array.from({ length: count }, (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`);
}

function blankContent(date) {
  return Object.fromEntries(CONTENT_HEADERS.map((header) => [header, header === "date" ? date : ""]));
}

function draftKey() { return `siea-content-draft-${selectedMonth}`; }

function saveDraft() {
  if (!selectedMonth) return;
  localStorage.setItem(draftKey(), JSON.stringify(Array.from(contentRecords.values())));
}

function loadMonth(month, reset = false) {
  selectedMonth = month;
  const dates = datesForMonth(month);
  let saved = [];
  if (!reset) {
    try { saved = JSON.parse(localStorage.getItem(draftKey()) || "[]"); } catch (_) { saved = []; }
  }
  const savedMap = new Map(saved.map((record) => [record.date, record]));
  contentRecords = new Map(dates.map((date) => [date, { ...blankContent(date), ...(savedMap.get(date) || {}) }]));
  const selector = document.getElementById("content-day");
  selector.innerHTML = dates.map((date, index) => `<option value="${date}">Day ${index + 1} · ${date}</option>`).join("");
  document.getElementById("daily-editor").hidden = false;
  selector.value = dates[0];
  renderContentDay();
}

function initialiseMonth() {
  if (selectedMonth) return;
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const month = `${values.year}-${values.month}`;
  document.getElementById("content-month").value = month;
  loadMonth(month);
}

function fieldComplete(record, prefix) {
  const required = prefix === "quran"
    ? ["quran_arabic","quran_translation","quran_verse","quran_detail"]
    : prefix === "hadith"
      ? ["hadith_arabic","hadith_english","hadith_reference"]
      : ["wisdom_arabic","wisdom_english","wisdom_reference"];
  return required.every((field) => record[field]?.trim());
}

function dayComplete(record) { return fieldComplete(record,"quran") && fieldComplete(record,"hadith") && fieldComplete(record,"wisdom"); }

function updateContentProgress() {
  const records = Array.from(contentRecords.values());
  const complete = records.filter(dayComplete).length;
  document.getElementById("content-progress").textContent = `${complete} of ${records.length} days complete for ${selectedMonth}. Drafts save automatically on this browser.`;
}

function renderContentDay() {
  const date = document.getElementById("content-day").value;
  const record = contentRecords.get(date);
  if (!record) return;
  document.querySelectorAll("#daily-editor [data-field]").forEach((input) => { input.value = record[input.dataset.field] || ""; });
  const quran = fieldComplete(record,"quran"), hadith = fieldComplete(record,"hadith"), wisdom = fieldComplete(record,"wisdom");
  const status = document.getElementById("day-status");
  status.className = `status ${quran && hadith && wisdom ? "success" : "neutral"}`;
  status.textContent = `${date}: Qur’an ${quran ? "complete" : "incomplete"}; Hadith ${hadith ? "complete" : "incomplete"}; Wisdom ${wisdom ? "complete" : "incomplete"}.`;
  updateContentProgress();
}

document.getElementById("create-month").addEventListener("click", () => {
  const month = document.getElementById("content-month").value;
  if (month) loadMonth(month);
});

document.getElementById("content-day").addEventListener("change", renderContentDay);
document.getElementById("daily-editor").addEventListener("input", (event) => {
  const field = event.target.dataset.field;
  if (!field) return;
  const record = contentRecords.get(document.getElementById("content-day").value);
  record[field] = event.target.value;
  saveDraft();
  renderContentDay();
});

function moveDay(amount) {
  const selector = document.getElementById("content-day");
  selector.selectedIndex = Math.max(0, Math.min(selector.options.length - 1, selector.selectedIndex + amount));
  renderContentDay();
}
document.getElementById("previous-day").addEventListener("click", () => moveDay(-1));
document.getElementById("next-day").addEventListener("click", () => moveDay(1));

function resolveContentDate(value) {
  const text = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const match = text.match(/^(?:day\s*)?(\d{1,2})$/i);
  if (match) return `${selectedMonth}-${String(Number(match[1])).padStart(2,"0")}`;
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.valueOf())) return parsed.toISOString().slice(0,10);
  throw new Error(`Invalid day/date: ${text}`);
}

function importContentMatrix(matrix) {
  const imported = recordsFromMatrix(matrix, CONTENT_HEADERS);
  imported.forEach((record) => {
    const date = resolveContentDate(record.date);
    if (!date.startsWith(`${selectedMonth}-`) || !contentRecords.has(date)) throw new Error(`${date} is outside selected month ${selectedMonth}.`);
    contentRecords.set(date, { ...blankContent(date), ...record, date });
  });
  saveDraft();
  renderContentDay();
  return imported.length;
}

document.getElementById("content-file").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  const message = document.getElementById("content-import-message");
  if (!file) return;
  try {
    const count = importContentMatrix(await readTabularFile(file));
    message.className = "status success";
    message.textContent = `${count} daily rows imported successfully for ${selectedMonth}.`;
  } catch (error) {
    message.className = "status error";
    message.textContent = error.message;
  }
});

function contentTemplateMatrix() {
  return [CONTENT_HEADERS, ...datesForMonth(selectedMonth).map((date) => CONTENT_HEADERS.map((header) => header === "date" ? date : ""))];
}

document.getElementById("download-content-csv-template").addEventListener("click", () => {
  downloadFile(`SIEA_Content_${selectedMonth}.csv`, matrixToCsv(contentTemplateMatrix()));
});

document.getElementById("download-content-xlsx-template").addEventListener("click", () => {
  if (!window.XLSX) {
    const message = document.getElementById("content-import-message");
    message.className = "status error";
    message.textContent = "Excel generator could not load. Use the CSV template, which opens normally in Excel.";
    return;
  }
  const worksheet = XLSX.utils.aoa_to_sheet(contentTemplateMatrix());
  worksheet["!cols"] = CONTENT_HEADERS.map((header) => ({ wch: header.includes("arabic") || header.includes("translation") || header.includes("detail") ? 38 : 22 }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Monthly Content");
  XLSX.writeFile(workbook, `SIEA_Content_${selectedMonth}.xlsx`);
});

function validateContentMonth() {
  const errors = [];
  for (const record of contentRecords.values()) {
    if (!fieldComplete(record,"quran")) errors.push(`${record.date}: Qur’an incomplete`);
    if (!fieldComplete(record,"hadith")) errors.push(`${record.date}: Hadith incomplete`);
    if (!fieldComplete(record,"wisdom")) errors.push(`${record.date}: Wisdom incomplete`);
  }
  return errors;
}

function applicationContentMatrix() {
  const headers = ["id","date","type","arabic","english","reference","scholar","detail"];
  const rows = [];
  for (const record of contentRecords.values()) {
    const id = record.date.replaceAll("-","");
    rows.push([`quran-${id}`,record.date,"QURAN",record.quran_arabic,record.quran_translation,record.quran_verse,"",record.quran_detail]);
    rows.push([`hadith-${id}`,record.date,"HADITH",record.hadith_arabic,record.hadith_english,record.hadith_reference,"",""]);
    rows.push([`wisdom-${id}`,record.date,"SCHOLAR",record.wisdom_arabic,record.wisdom_english,record.wisdom_reference,"",""]);
  }
  return [headers, ...rows];
}

document.getElementById("validate-content").addEventListener("click", () => {
  const errors = validateContentMonth();
  const message = document.getElementById("content-validation-message");
  const download = document.getElementById("download-content");
  const publish = document.getElementById("publish-content");
  if (errors.length) {
    message.className = "status error";
    message.textContent = `${errors.length} sections require attention. ${errors.slice(0,6).join("; ")}${errors.length > 6 ? "; …" : ""}`;
    download.disabled = true; download.classList.add("disabled"); publish.classList.add("disabled");
  } else {
    message.className = "status success";
    message.textContent = `${contentRecords.size} days and ${contentRecords.size * 3} reminder items validated successfully.`;
    download.disabled = false; download.classList.remove("disabled"); publish.classList.remove("disabled");
  }
});

document.getElementById("download-content").addEventListener("click", () => {
  downloadFile("content.csv", matrixToCsv(applicationContentMatrix()));
});

if (sessionStorage.getItem(SESSION_KEY) === "active") showAdmin();
else showLogin();
