const required=["date","fajr_adhan","fajr_iqamah","dhuhr_adhan","dhuhr_iqamah","asr_adhan","asr_iqamah","maghrib_adhan","maghrib_iqamah","isha_adhan","isha_iqamah"];
const timePattern=/^(?:[01]\d|2[0-3]):[0-5]\d$/;

function parseCsv(text) {
  const rows=[]; let row=[],cell="",quoted=false;
  for(let i=0;i<text.length;i++) { const c=text[i],next=text[i+1]; if(c==='"'&&quoted&&next==='"'){cell+='"';i++;} else if(c==='"'){quoted=!quoted;} else if(c===','&&!quoted){row.push(cell);cell="";} else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&next==='\n')i++;row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell="";} else cell+=c; }
  row.push(cell); if(row.some(v=>v.trim()))rows.push(row); return rows;
}
function validate(text) {
  const matrix=parseCsv(text); if(matrix.length<2) throw Error("The file contains no timetable rows.");
  const headers=matrix[0].map(v=>v.trim().toLowerCase()); const missing=required.filter(h=>!headers.includes(h)); if(missing.length) throw Error(`Missing columns: ${missing.join(", ")}`);
  const records=matrix.slice(1).map((values,index)=>Object.fromEntries(headers.map((h,i)=>[h,(values[i]||"").trim()])));
  const seen=new Set(); records.forEach((r,index)=>{ if(!/^\d{4}-\d{2}-\d{2}$/.test(r.date)||Number.isNaN(Date.parse(`${r.date}T00:00:00Z`))) throw Error(`Invalid date on row ${index+2}. Use YYYY-MM-DD.`); if(seen.has(r.date)) throw Error(`Duplicate date ${r.date}.`); seen.add(r.date); required.slice(1).forEach(h=>{if(!timePattern.test(r[h])) throw Error(`Invalid ${h} on ${r.date}. Use HH:mm.`);}); });
  if(records.length<7) throw Error("Please provide at least seven days of timings."); return records.sort((a,b)=>a.date.localeCompare(b.date));
}
function pair(r,name){return `${r[`${name}_adhan`]} / ${r[`${name}_iqamah`]}`;}
function render(records) {
  document.getElementById("preview-summary").textContent=`${records.length} days validated: ${records[0].date} to ${records.at(-1).date}. Times show Adhan / Iqamah.`;
  document.getElementById("preview-body").innerHTML=records.slice(0,31).map(r=>`<tr><td>${r.date}</td><td>${pair(r,"fajr")}</td><td>${pair(r,"dhuhr")}</td><td>${pair(r,"asr")}</td><td>${pair(r,"maghrib")}</td><td>${pair(r,"isha")}</td></tr>`).join("");
}
document.getElementById("timetable-file").addEventListener("change",async event=>{
  const file=event.target.files[0],message=document.getElementById("validation-message"),publish=document.getElementById("publish-link"); publish.classList.add("disabled");
  if(!file)return;
  try { const records=validate(await file.text()); render(records); message.className="status success"; message.textContent=`Validated successfully: ${file.name}. Review the preview, then publish it using the exact name timetable.csv.`; publish.classList.remove("disabled"); }
  catch(error) { message.className="status error"; message.textContent=error.message; document.getElementById("preview-body").innerHTML='<tr><td colspan="6">Validation failed</td></tr>'; }
});

