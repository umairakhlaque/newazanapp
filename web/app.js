const prayerOrder = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
const labels = {fajr:"FAJR",dhuhr:"DHUHR",asr:"ASR",maghrib:"MAGHRIB",isha:"ISHA"};
let payload;
let countdownTimer;

function londonParts() {
  const parts = new Intl.DateTimeFormat("en-GB", {timeZone:"Europe/London", year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false,weekday:"long"}).formatToParts(new Date());
  return Object.fromEntries(parts.map(p => [p.type,p.value]));
}
function todayIso(p) { return `${p.year}-${p.month}-${p.day}`; }
function tomorrowIso(p) { const d = new Date(`${todayIso(p)}T12:00:00Z`); d.setUTCDate(d.getUTCDate()+1); return d.toISOString().slice(0,10); }
function mins(text) { const [h,m]=text.split(":").map(Number); return h*60+m; }

function buildMarkers() {
  const host=document.getElementById("clock-markers");
  for(let i=0;i<60;i++) { const marker=document.createElement("i"); marker.className=`marker ${i%5===0?"major":""}`; marker.style.transform=`rotate(${i*6}deg)`; host.appendChild(marker); }
}
function updateClock() {
  const now=new Date();
  const p=londonParts();
  const h=Number(p.hour)%12, m=Number(p.minute), s=Number(p.second);
  document.getElementById("hour-hand").style.transform=`translateX(-50%) rotate(${h*30+m*.5}deg)`;
  document.getElementById("minute-hand").style.transform=`translateX(-50%) rotate(${m*6+s*.1}deg)`;
  document.getElementById("second-hand").style.transform=`translateX(-50%) rotate(${s*6}deg)`;
  document.getElementById("digital-clock").textContent=`${p.hour}:${p.minute}`;
  document.getElementById("current-date").textContent=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/London",weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(now);
}
function renderRows() {
  if(!payload) return;
  const p=londonParts(), today=payload.prayer_days.find(d=>d.date===todayIso(p)), tomorrow=payload.prayer_days.find(d=>d.date===tomorrowIso(p));
  const nowMins=Number(p.hour)*60+Number(p.minute);
  const rows=document.getElementById("prayer-rows"); rows.innerHTML="";
  prayerOrder.forEach(name => {
    const rolled=today && nowMins>=mins(today[name].iqamah);
    const selected=(rolled?tomorrow:today)?.[name];
    const nextNames=prayerOrder.filter(n=>today && nowMins<mins(today[n].iqamah));
    const isNext=!rolled && nextNames[0]===name;
    const row=document.createElement("div"); row.className=`prayer-row ${isNext?"next":""}`;
    row.innerHTML=`<div class="prayer-name">${labels[name]}<small class="row-label">${rolled?"TOMORROW":isNext?"NEXT PRAYER":"&nbsp;"}</small></div><span class="prayer-time">${selected?.adhan||"--:--"}</span><span class="prayer-time">${selected?.iqamah||"--:--"}</span>`;
    rows.appendChild(row);
  });
}
function show(name) { document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active")); document.getElementById(`${name}-screen`).classList.add("active"); }
function showContent(type) {
  const item=payload?.content.find(c=>c.type===type) || (type==="QURAN"?{arabic:"يَا أَيُّهَا الَّذِينَ آمَنُوا اسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ ۚ إِنَّ اللَّهَ مَعَ الصَّابِرِينَ",english:"Believers, seek help through patience and prayer. Surely Allah is with those who remain patient.",reference:"Surah Al-Baqarah 2:153"}:{arabic:"إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ",english:"Actions are judged by intentions.",reference:"Riyad as-Salihin Hadith 1"});
  document.getElementById("content-title").textContent=type==="QURAN"?"AYAH OF THE DAY":"HADITH OF THE DAY";
  document.getElementById("content-arabic").textContent=item.arabic; document.getElementById("content-english").textContent=item.english; document.getElementById("content-reference").textContent=item.reference;
  show("content");
}
function startCountdown() {
  clearInterval(countdownTimer); let remaining=120; show("iqamah");
  const draw=()=>{ document.getElementById("countdown").textContent=`${String(Math.floor(remaining/60)).padStart(2,"0")}:${String(remaining%60).padStart(2,"0")}`; if(remaining--<=0){clearInterval(countdownTimer);show("main");renderRows();} };
  draw(); countdownTimer=setInterval(draw,1000);
}
document.querySelectorAll("[data-screen]").forEach(button=>button.addEventListener("click",()=>{
  clearInterval(countdownTimer); const target=button.dataset.screen;
  if(target==="quran") showContent("QURAN"); else if(target==="hadith") showContent("HADITH"); else if(target==="iqamah") startCountdown(); else show(target);
}));

async function initialise() {
  buildMarkers(); updateClock(); setInterval(updateClock,1000);
  try { payload=await fetch("data/payload.json",{cache:"no-store"}).then(r=>{if(!r.ok) throw Error(r.status);return r.json();}); renderRows(); }
  catch(error) { console.error("Could not load timetable",error); }
}
initialise();

