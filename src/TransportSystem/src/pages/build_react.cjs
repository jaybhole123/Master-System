const fs = require('fs');

const inputHtml = `<!DOCTYPE html>
<html lang="hi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Truck Data System</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
<style>
:root{box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);
--bg:#f4f6fa;--card:#fff;--tx:#18202e;--mut:#667085;--bd:#dfe3ea;--pri:#1f5fbf;--pri2:#e7effb;
--ok:#16794a;--okb:#e3f6ec;--wa:#a15c00;--wab:#fff1d6;--er:#b42318;--erb:#fde7e5}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#111723;--card:#1a2232;--tx:#e8ecf3;--mut:#9aa6ba;--bd:#2c374c;--pri:#6ea2f0;--pri2:#22314d;--ok:#5fd39a;--okb:#16352a;--wa:#f0b65a;--wab:#3a2c11;--er:#f48a80;--erb:#3d1b18}}
:root[data-theme="dark"]{--bg:#111723;--card:#1a2232;--tx:#e8ecf3;--mut:#9aa6ba;--bd:#2c374c;--pri:#6ea2f0;--pri2:#22314d;--ok:#5fd39a;--okb:#16352a;--wa:#f0b65a;--wab:#3a2c11;--er:#f48a80;--erb:#3d1b18}
html{scroll-padding-top:env(safe-area-inset-top,0px)}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--tx);font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
header{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;padding:12px 18px;background:var(--card);border-bottom:1px solid var(--bd)}
h1{font-size:18px;margin:0}h1 small{display:block;font-weight:400;color:var(--mut);font-size:12px}
nav{display:flex;gap:4px;padding:8px 18px 0;background:var(--card);border-bottom:1px solid var(--bd);overflow-x:auto}
nav button{border:0;background:none;color:var(--mut);padding:9px 16px;font:inherit;font-weight:600;cursor:pointer;border-bottom:3px solid transparent;white-space:nowrap}
nav button.on{color:var(--pri);border-color:var(--pri)}
main{padding:16px 18px;max-width:1600px;margin:auto}
.btn{border:1px solid var(--bd);background:var(--card);color:var(--tx);padding:8px 13px;border-radius:8px;cursor:pointer;font:inherit}
.btn:hover{background:var(--pri2)}.btn.p{background:var(--pri);border-color:var(--pri);color:#fff}.btn.p:hover{opacity:.9}
.btn.s{padding:3px 8px;font-size:12px}.btn.d{color:var(--er)}
.row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:14px}
.kpi{background:var(--card);border:1px solid var(--bd);border-radius:10px;padding:11px 13px;cursor:pointer}
.kpi b{display:block;font-size:22px}.kpi span{color:var(--mut);font-size:12px}
.kpi.er b{color:var(--er)}.kpi.wa b{color:var(--wa)}.kpi.ok b{color:var(--ok)}
#alert{display:none;flex-wrap:wrap;gap:8px;margin-bottom:14px}
#alert .btn{background:var(--wab);color:var(--wa);border-color:transparent}#alert .btn.er{background:var(--erb);color:var(--er)}
.grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:12px;margin-bottom:14px}
.card{background:var(--card);border:1px solid var(--bd);border-radius:10px;padding:12px 14px;min-width:0;max-height:300px;overflow:auto}
.card h3{margin:0 0 8px;font-size:13px;color:var(--mut);font-weight:600}
.bar{display:flex;align-items:center;gap:8px;margin:5px 0;font-size:12px}
.bar i{flex:0 0 96px;font-style:normal;color:var(--mut);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bar div{height:14px;background:var(--pri);border-radius:4px;min-width:3px}.bar em{font-style:normal}
input,select{font:inherit;color:var(--tx);background:var(--card);border:1px solid var(--bd);border-radius:8px;padding:7px 9px;max-width:100%}
.tw{overflow-x:auto;background:var(--card);border:1px solid var(--bd);border-radius:10px}
table{border-collapse:collapse;width:100%;white-space:nowrap}
th,td{padding:8px 10px;border-bottom:1px solid var(--bd);text-align:left}
th{background:var(--pri2);cursor:pointer;font-size:12px;position:sticky;top:0;user-select:none}
tr:hover td{background:var(--pri2)}td.n{text-align:right}
.tag{padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600}
.ACTIVE{background:var(--okb);color:var(--ok)}.EXPIRED{background:var(--erb);color:var(--er)}.DUE{background:var(--wab);color:var(--wa)}
.lk{color:var(--pri);cursor:pointer;text-decoration:underline;font-weight:600}.lk.er{color:var(--er)}
.ov{position:fixed;inset:0;background:rgba(0,0,0,.5);display:none;align-items:flex-start;justify-content:center;overflow:auto;padding:20px;z-index:9}
.ov.on{display:flex}
.modal{background:var(--card);border-radius:12px;padding:18px;width:100%;max-width:760px;margin:auto}
.modal h2{margin:0 0 12px;font-size:16px}.modal h4{margin:14px 0 6px;font-size:13px;color:var(--mut)}
.f{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px}
.f label{display:flex;flex-direction:column;font-size:12px;color:var(--mut);gap:3px}.f input,.f select{width:100%}
.kv{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:6px 14px;font-size:13px}.kv span{color:var(--mut);display:block;font-size:11px}
.msg{color:var(--er);font-size:12px;margin-top:8px;min-height:16px}
.empty{padding:24px;text-align:center;color:var(--mut)}
#toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#222;color:#fff;padding:10px 16px;border-radius:8px;display:none;z-index:20;max-width:90%}
</style></head>
<body>
<header>
  <h1>🚛 Truck Data System<small id="sub">Trucks · FASTag · Challan</small></h1>
  <div class="row">
    <button class="btn p" id="add">+ Add</button>
    <button class="btn" id="imp">⬆ Import Excel</button>
    <button class="btn" id="exp">⬇ Export Excel</button>
    <input type="file" id="file" accept=".xlsx,.xls" hidden>
  </div>
</header>
<nav id="nav"><button data-t="trucks">🚚 Trucks (RTO &amp; Insurance)</button><button data-t="fastag">🏷️ FASTag</button><button data-t="Challan">🚨 Challan</button></nav>
<main>
  <div id="alert"></div>
  <div class="kpis" id="kpis"></div>
  <div class="grid2"><div class="card" id="c1"></div><div class="card" id="c2"></div></div>
  <div class="row" style="margin-bottom:10px">
    <input id="q" placeholder="🔍 Search…" style="flex:1;min-width:220px">
    <select id="fs"></select>
    <select id="fc"><option value="">All Companies</option></select>
    <span id="cnt" style="color:var(--mut)"></span>
  </div>
  <div class="tw"><table><thead id="th"></thead><tbody id="tb"></tbody></table><div class="empty" id="empty" style="display:none">Koi data nahi mila. "+ Add" ya "Import Excel" use karein.</div></div>
</main>
<div class="ov" id="ov"><div class="modal">
  <h2 id="mt"></h2><div class="f" id="fm"></div><div class="msg" id="msg"></div>
  <div class="row" style="margin-top:12px;justify-content:flex-end">
    <button class="btn" id="cx">Cancel</button><button class="btn" id="sn">Save &amp; Add Another</button><button class="btn p" id="sv">Save</button>
  </div>
</div></div>
<div class="ov" id="pv"><div class="modal" id="pm"></div></div>
<div id="dls"></div><div id="toast"></div>
 
<script>
const SEED=[{"id": "CG10CG5622", "vno": "CG10CG5622", "owner": "ASAK LOGISTICS PVT.LTD.", "company": "THE NEW INDIA ASSURANCE CO.LTD.", "policy": "54020031260300001678", "start": "2026-09-07", "expiry": "2027-09-06", "idv": 5795000, "premium": 89975, "agent": "9835759489", "chassis": "MAT828126T2G17765", "engine": "B6.7B6320D14162G6460789", "remarks": "TATA/SIGNA 5532.S"}, {"id": "CG10CG5722", "vno": "CG10CG5722", "owner": "ASAK LOGISTICS PVT.LTD.", "company": "THE NEW INDIA ASSURANCE CO.LTD.", "policy": "54020031260300001693", "start": "2026-09-07", "expiry": "2027-09-06", "idv": 5795000, "premium": 89975, "agent": "9835759489", "chassis": "MAT828126TAG19295", "engine": "62G95588371", "remarks": "TATA/SIGNA 5532.S"}];
const SC={
trucks:{n:"Truck",f:[["vno","Vehicle No.","text"],["owner","Owner Name","text"],["company","Insurance Company","text"],["policy","Policy No.","text"],["start","Policy Start Date","date"],["expiry","Policy Expiry Date","date"],["idv","IDV (₹)","number"],["premium","Premium (₹)","number"],["agent","Agent / Contact","text"],["chassis","Chassis No.","text"],["engine","Engine No.","text"],["remarks","Remarks","text"]],id:r=>idOf(r.vno)},
fastag:{n:"FASTag",f:[["vno","Vehicle No.","veh"],["tagId","FASTag / Tag ID","text"],["bank","Bank / Issuer","text"],["balance","Current Balance (₹)","number"],["minBal","Low Balance Alert Below (₹)","number"],["lastDate","Last Recharge Date","date"],["lastAmt","Last Recharge Amount (₹)","number"],["status","Tag Status","sel:Active,Blocked,Inactive"],["remarks","Remarks","text"]],id:r=>idOf(r.vno)},
Challan:{n:"Challan",f:[["ChallanNo","Challan No.","text"],["vno","Vehicle No.","veh"],["date","Challan Date","date"],["place","Place / Location","text"],["offence","Offence","text"],["amount","Amount (₹)","number"],["status","Status","sel:Pending,Paid,Disputed"],["paidDate","Paid Date","date"],["driver","Driver Name","text"],["remarks","Remarks","text"]],id:r=>idOf(r.ChallanNo)}};
const OPT={trucks:["ACTIVE","DUE IN 30 DAYS","DUE IN 7 DAYS","DUE TODAY","EXPIRED"],fastag:["ACTIVE","LOW BALANCE","BLOCKED","INACTIVE"],Challan:["PENDING","PAID","DISPUTED"]};
const LISTK=["owner","company","agent","bank","offence","place","driver"];
let D={trucks:[],fastag:[],Challan:[]},db=null,tab=window.__START_TAB||"trucks",sortK={trucks:"expiry",fastag:"vno",Challan:"date"},sortD={trucks:1,fastag:1,Challan:-1},fmx=null,delArm=null;
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const idOf=v=>String(v||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
const inr=n=>"₹"+Number(n||0).toLocaleString("en-IN");
const pad=n=>String(n).padStart(2,"0");
const iso=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const todayS=()=>iso(new Date());
const fmt=s=>{if(!s)return"";const [y,m,d]=s.split("-");return \`\${d}-\${m}-\${y}\`};
function addDay(s,n){const [y,m,d]=s.split("-").map(Number);return iso(new Date(y,m-1,d+n))}
function addYear(s,n){const [y,m,d]=s.split("-").map(Number);return iso(new Date(y+n,m-1,d))}
function days(r){if(!r.expiry)return null;const [y,m,d]=r.expiry.split("-").map(Number),t=new Date();return Math.round((new Date(y,m-1,d)-new Date(t.getFullYear(),t.getMonth(),t.getDate()))/864e5)}
function istat(r){const d=days(r);if(d===null)return"";return d<0?"EXPIRED":d===0?"DUE TODAY":d<=7?"DUE IN 7 DAYS":d<=30?"DUE IN 30 DAYS":"ACTIVE"}
function fstat(r){const s=String(r.status||"Active").toUpperCase();return s==="ACTIVE"?((+r.balance||0)<(+r.minBal||0)?"LOW BALANCE":"ACTIVE"):s}
const cstat=r=>String(r.status||"").toUpperCase();
const cls=s=>["ACTIVE","PAID"].includes(s)?"ACTIVE":["EXPIRED","BLOCKED"].includes(s)?"EXPIRED":"DUE";
function clean(c,r){const o={};SC[c].f.forEach(([k,,t])=>{let v=r[k];if(t==="number")v=+v||0;else v=String(v??"").trim();
  if(["vno","chassis","engine","ChallanNo"].includes(k))v=v.toUpperCase();if(k==="policy")v=v.replace(/^[\s,]+/,"");o[k]=v});return o}
function toast(m){const t=$("toast");t.textContent=m;t.style.display="block";clearTimeout(toast.h);toast.h=setTimeout(()=>t.style.display="none",3500)}
 
/* ---------- storage ---------- */
function lsGet(){try{return JSON.parse(localStorage.getItem("fleet_v2")||"null")}catch(e){return null}}
function lsSet(){try{localStorage.setItem("fleet_v2",JSON.stringify(D))}catch(e){}}
async function put(c,r){r=clean(c,r);r.id=SC[c].id(r);
  if(db)await db.collection(c).doc(r.id).set(r);
  else{D[c]=D[c].filter(x=>x.id!==r.id).concat(r);lsSet();render()}}
async function del(c,id){if(db)await db.collection(c).doc(id).delete();else{D[c]=D[c].filter(x=>x.id!==id);lsSet();render()}}
async function init(){
  const s=lsGet();if(s)D={trucks:s.trucks||[],fastag:s.fastag||[],Challan:s.Challan||[]};else if(SEED){D.trucks=SEED.map(r=>({...r}));lsSet()}
  render();
  db=null;
  if(db){$("sub").textContent="Trucks · FASTag · Challan · saved online";D={trucks:[],fastag:[],Challan:[]};
    Object.keys(D).forEach(c=>db.collection(c).onSnapshot(sn=>{D[c]=sn.docs.map(d=>({id:d.id,...d.data()}));render()},()=>{}));render()}
  else $("sub").textContent="Trucks · FASTag · Challan · data is browser me save hota hai (backup: Export Excel)";
}
 
/* ---------- linked lookups ---------- */
const tOf=v=>D.trucks.find(t=>t.id===idOf(v));
const pend=()=>{const p={};D.Challan.forEach(c=>{if(cstat(c)==="PENDING"){const k=idOf(c.vno);(p[k]=p[k]||{n:0,a:0});p[k].n++;p[k].a+=+c.amount||0}});return p};
const bars=(a,f)=>{const mx=Math.max(1,...a.map(x=>x[1]));return a.length?a.map(x=>\`<div class="bar"><i title="\${esc(x[0])}">\${esc(x[0])}</i><div style="width:\${x[1]/mx*65}%"></div><em>\${f?f(x[1]):x[1]}</em></div>\`).join(""):\`<div class="empty">No data</div>\`};
const vl=v=>\`<span class="lk" data-v="\${idOf(v)}">\${esc(v)}</span>\`;
const go=(t,q,s)=>\`data-go="\${t}|\${esc(q||"")}|\${esc(s||"")}"\`;
 
/* ---------- render ---------- */
function render(){
  document.querySelectorAll("#nav button").forEach(b=>b.classList.toggle("on",b.dataset.t===tab));
  $("add").textContent="+ Add "+SC[tab].n;$("fc").style.display=tab==="trucks"?"":"none";
  const P=pend(),T=D.trucks.map(r=>({...r,_d:days(r),_s:istat(r)})),
    F=D.fastag.map(r=>({...r,_s:fstat(r),_o:tOf(r.vno)?.owner||""})),
    C=D.Challan.map(r=>({...r,_s:cstat(r),_o:tOf(r.vno)?.owner||""}));
  const ft={};F.forEach(r=>ft[idOf(r.vno)]=r);
  T.forEach(r=>{r._fb=ft[r.id]?+ft[r.id].balance:-1;r._pa=P[r.id]?.a||0});
  // combined alerts (connect all pages)
  const ia=T.filter(r=>r._d!==null&&r._d<=30).length,fa=F.filter(r=>["LOW BALANCE","BLOCKED"].includes(r._s)).length,pa=Object.values(P).reduce((a,b)=>a+b.n,0),pm=Object.values(P).reduce((a,b)=>a+b.a,0);
  const al=[];if(ia)al.push(\`<button class="btn \${T.some(r=>r._s==="EXPIRED")?"er":""}" \${go("trucks","","DUE IN 30 DAYS")}>⚠ \${ia} insurance expire/due</button>\`);
  if(fa)al.push(\`<button class="btn er" \${go("fastag","","LOW BALANCE")}>🏷️ \${fa} FASTag low/blocked</button>\`);
  if(pa)al.push(\`<button class="btn er" \${go("Challan","","PENDING")}>🚨 \${pa} Challan pending (\${inr(pm)})</button>\`);
  $("alert").style.display=al.length?"flex":"none";$("alert").innerHTML=al.join("");
  const K=[],S=(a,f)=>a.filter(x=>f(x)).length;
  if(tab==="trucks"){K.push(["",T.length,"Total Trucks",""],["ACTIVE",S(T,r=>r._s==="ACTIVE"),"Active","ok"],["DUE IN 30 DAYS",S(T,r=>r._s.startsWith("DUE")),"Due ≤ 30 days","wa"],["EXPIRED",S(T,r=>r._s==="EXPIRED"),"Expired","er"],["",inr(T.reduce((a,r)=>a+r.idv,0)),"Total IDV",""],["",inr(T.reduce((a,r)=>a+r.premium,0)),"Total Premium",""]);
    const mm={};T.forEach(r=>{if(r.expiry)mm[r.expiry.slice(0,7)]=(mm[r.expiry.slice(0,7)]||0)+1});
    $("c1").innerHTML="<h3>EXPIRY TIMELINE (month-wise)</h3>"+bars(Object.keys(mm).sort().map(k=>[new Date(k.slice(0,4),+k.slice(5)-1,1).toLocaleString("en-IN",{month:"short",year:"2-digit"}),mm[k]]));
    const co={};T.forEach(r=>{const k=r.company||"—";(co[k]=co[k]||{n:0,p:0});co[k].n++;co[k].p+=r.premium});
    $("c2").innerHTML="<h3>INSURANCE COMPANY-WISE</h3>"+(T.length?"<table><tr><th>Company</th><th>Trucks</th><th>Premium</th></tr>"+Object.entries(co).map(([k,v])=>\`<tr><td>\${esc(k)}</td><td class="n">\${v.n}</td><td class="n">\${inr(v.p)}</td></tr>\`).join("")+"</table>":\`<div class="empty">No data</div>\`)}
  if(tab==="fastag"){const no=T.filter(r=>!ft[r.id]);
    K.push(["",F.length,"FASTags",""],["ACTIVE",S(F,r=>r._s==="ACTIVE"),"Active","ok"],["LOW BALANCE",S(F,r=>r._s==="LOW BALANCE"),"Low Balance","wa"],["BLOCKED",S(F,r=>r._s==="BLOCKED"),"Blocked","er"],["",inr(F.reduce((a,r)=>a+(+r.balance||0),0)),"Total Balance",""],["",no.length,"Trucks without FASTag",no.length?"er":"ok"]);
    $("c1").innerHTML="<h3>BALANCE BY VEHICLE (lowest first)</h3>"+bars([...F].sort((a,b)=>a.balance-b.balance).map(r=>[r.vno,+r.balance||0]),inr);
    $("c2").innerHTML="<h3>TRUCKS WITHOUT FASTAG (click to add)</h3>"+(no.length?no.map(r=>\`<button class="btn s" style="margin:2px" data-af="\${esc(r.vno)}">+ \${esc(r.vno)}</button>\`).join(""):\`<div class="empty">Sab trucks me FASTag hai ✔</div>\`)}
  if(tab==="Challan"){const pv={},of={};C.forEach(r=>{if(r._s==="PENDING")pv[r.vno]=(pv[r.vno]||0)+(+r.amount||0);of[r.offence||"—"]=(of[r.offence||"—"]||0)+(+r.amount||0)});
    K.push(["",C.length,"Total Challans",""],["PENDING",S(C,r=>r._s==="PENDING"),"Pending","er"],["",inr(pm),"Pending Amount","er"],["PAID",S(C,r=>r._s==="PAID"),"Paid","ok"],["",inr(C.filter(r=>r._s==="PAID").reduce((a,r)=>a+(+r.amount||0),0)),"Paid Amount",""],["DISPUTED",S(C,r=>r._s==="DISPUTED"),"Disputed","wa"]);
    $("c1").innerHTML="<h3>PENDING AMOUNT BY VEHICLE</h3>"+bars(Object.entries(pv).sort((a,b)=>b[1]-a[1]),inr);
    $("c2").innerHTML="<h3>OFFENCE-WISE AMOUNT</h3>"+bars(Object.entries(of).sort((a,b)=>b[1]-a[1]),inr)}
  $("kpis").innerHTML=K.map(k=>\`<div class="kpi \${k[3]}" data-s="\${k[0]}"><b>\${k[1]}</b><span>\${k[2]}</span></div>\`).join("");
  // filters + datalists
  const fs=$("fs"),fv=fs.value;fs.innerHTML=\`<option value="">All Status</option>\`+OPT[tab].map(o=>\`<option>\${o}</option>\`).join("");fs.value=OPT[tab].includes(fv)?fv:"";
  const fc=$("fc"),cv=fc.value,cs=[...new Set(T.map(r=>r.company).filter(Boolean))].sort();fc.innerHTML=\`<option value="">All Companies</option>\`+cs.map(c=>\`<option>\${esc(c)}</option>\`).join("");fc.value=cs.includes(cv)?cv:"";
  $("dls").innerHTML=LISTK.map(k=>\`<datalist id="dl-\${k}">\`+[...new Set([...D.trucks,...D.fastag,...D.Challan].map(r=>r[k]).filter(Boolean))].map(v=>\`<option value="\${esc(v)}">\`).join("")+"</datalist>").join("");
  // table
  const A=(l,k,fn,c)=>[l,k,fn,c],
   act=(r,x)=>\`<td><button class="btn s" data-a="e" data-i="\${r.id}">Edit</button> \${x||""}<button class="btn s d" data-a="d" data-i="\${r.id}">\${delArm===r.id?"Sure?":"Delete"}</button></td>\`;
  const COLS={
   trucks:[A("Vehicle No.","vno",r=>\`<b>\${vl(r.vno)}</b>\`),A("Owner","owner",r=>esc(r.owner)),A("Insurance Co.","company",r=>esc(r.company)),A("Policy No.","policy",r=>esc(r.policy)),A("Start","start",r=>fmt(r.start)),A("Expiry","expiry",r=>fmt(r.expiry)),A("Days Left","_d",r=>r._d??"","n"),A("Status","_s",r=>\`<span class="tag \${cls(r._s)}">\${r._s}</span>\`),A("IDV","idv",r=>inr(r.idv),"n"),A("Premium","premium",r=>inr(r.premium),"n"),
    A("FASTag","_fb",r=>r._fb<0?\`<span class="lk er" data-af="\${esc(r.vno)}">+ Add</span>\`:\`<span class="lk" \${go("fastag",r.vno)}>\${inr(r._fb)}</span>\`),
    A("Pending Challan","_pa",r=>P[r.id]?\`<span class="lk er" \${go("Challan",r.vno,"PENDING")}>\${P[r.id].n} · \${inr(P[r.id].a)}</span>\`:\`<span class="lk" \${go("Challan",r.vno)}>—</span>\`),
    A("Agent","agent",r=>esc(r.agent)),A("Chassis No.","chassis",r=>esc(r.chassis)),A("Engine No.","engine",r=>esc(r.engine)),A("Remarks","remarks",r=>esc(r.remarks))],
   fastag:[A("Vehicle No.","vno",r=>\`<b>\${vl(r.vno)}</b>\`),A("Owner","_o",r=>esc(r._o)),A("Tag ID","tagId",r=>esc(r.tagId)),A("Bank","bank",r=>esc(r.bank)),A("Balance","balance",r=>inr(r.balance),"n"),A("Alert Below","minBal",r=>inr(r.minBal),"n"),A("Last Recharge","lastDate",r=>fmt(r.lastDate)),A("Last Amount","lastAmt",r=>inr(r.lastAmt),"n"),A("Status","_s",r=>\`<span class="tag \${cls(r._s)}">\${r._s}</span>\`),
    A("Pending Challan","vno",r=>P[idOf(r.vno)]?\`<span class="lk er" \${go("Challan",r.vno,"PENDING")}>\${P[idOf(r.vno)].n} · \${inr(P[idOf(r.vno)].a)}</span>\`:"—"),A("Remarks","remarks",r=>esc(r.remarks))],
   Challan:[A("Challan No.","ChallanNo",r=>\`<b>\${esc(r.ChallanNo)}</b>\`),A("Vehicle No.","vno",r=>vl(r.vno)),A("Owner","_o",r=>esc(r._o)),A("Date","date",r=>fmt(r.date)),A("Place","place",r=>esc(r.place)),A("Offence","offence",r=>esc(r.offence)),A("Amount","amount",r=>inr(r.amount),"n"),A("Status","_s",r=>\`<span class="tag \${cls(r._s)}">\${r._s}</span>\`),A("Paid Date","paidDate",r=>fmt(r.paidDate)),A("Driver","driver",r=>esc(r.driver)),
    A("FASTag","vno",r=>{const f=ft[idOf(r.vno)];return f?\`<span class="lk" \${go("fastag",r.vno)}>\${inr(f.balance)}</span>\`:"—"}),A("Remarks","remarks",r=>esc(r.remarks))]}[tab];
  const q=$("q").value.toLowerCase(),fsv=$("fs").value,fcv=$("fc").value,src={trucks:T,fastag:F,Challan:C}[tab];
  let v=src.filter(r=>(!fsv||r._s===fsv)&&(!fcv||r.company===fcv)&&(!q||SC[tab].f.some(f=>String(r[f[0]]??"").toLowerCase().includes(q))||String(r._o||"").toLowerCase().includes(q)));
  const sk=sortK[tab],sd=sortD[tab];v.sort((a,b)=>{const x=a[sk]??"",y=b[sk]??"";return (x>y?1:x<y?-1:0)*sd});
  $("th").innerHTML="<tr><th>#</th>"+COLS.map(c=>\`<th data-k="\${c[1]}">\${c[0]}\${c[1]===sk?(sd>0?" ▲":" ▼"):""}</th>\`).join("")+"<th>Action</th></tr>";
  $("tb").innerHTML=v.map((r,i)=>"<tr><td>"+(i+1)+"</td>"+COLS.map(c=>\`<td class="\${c[3]||""}">\${c[2](r)}</td>\`).join("")+
    act(r,tab==="trucks"?\`<button class="btn s" data-a="r" data-i="\${r.id}">Renew</button> \`:tab==="fastag"?\`<button class="btn s" data-a="rc" data-i="\${r.id}">Recharge</button> \`:(r._s!=="PAID"?\`<button class="btn s" data-a="pd" data-i="\${r.id}">Mark Paid</button> \`:""))+"</tr>").join("");
  $("empty").style.display=v.length?"none":"block";$("cnt").textContent=\`\${v.length} / \${src.length}\`;
}
 
/* ---------- form ---------- */
function openForm(c,r,id,o){o=o||{};r=r||{};const fl=o.fields||SC[c].f;fmx={c,id:id||null,fl,save:o.save};
  $("mt").textContent=o.title||((id?"Edit ":"Add ")+SC[c].n);
  $("fm").innerHTML=fl.map(([k,l,t])=>{const val=esc(r[k]??"");let inp;
    if(t==="veh"){const vs=D.trucks.map(x=>x.vno);if(r[k]&&!vs.includes(r[k]))vs.push(r[k]);inp=\`<select id="f_\${k}"><option value="">— truck chuniye —</option>\${vs.map(x=>\`<option \${x===r[k]?"selected":""}>\${esc(x)}</option>\`).join("")}</select>\`}
    else if(t.startsWith("sel:"))inp=\`<select id="f_\${k}">\${t.slice(4).split(",").map(x=>\`<option \${x===(r[k]||t.slice(4).split(",")[0])?"selected":""}>\${x}</option>\`).join("")}</select>\`;
    else inp=\`<input id="f_\${k}" type="\${t}" value="\${val}" \${LISTK.includes(k)?\`list="dl-\${k}"\`:""}>\`;
    return \`<label>\${l}\${inp}</label>\`}).join("");
  $("msg").textContent="";$("sn").style.display=id||o.save?"none":"";$("ov").classList.add("on");
  if(c==="trucks"&&id&&$("f_vno"))$("f_vno").readOnly=true;
  const f0=$("fm").querySelector("input,select");if(f0)f0.focus()}
const closeForm=()=>$("ov").classList.remove("on");
async function save(again){
  const {c,id:eid,fl,save:cs}=fmx,raw={};fl.forEach(([k])=>raw[k]=$("f_"+k).value);
  if(cs){try{await cs(raw);closeForm()}catch(x){$("msg").textContent="⚠ "+(x.message||x.code)}return}
  const r=clean(c,raw),e=[],id=SC[c].id(r);
  if(c==="Challan"&&!r.ChallanNo){r.ChallanNo="CH"+Date.now().toString(36).toUpperCase();}
  const nid=SC[c].id(r),oth=D[c].filter(x=>x.id!==eid);
  if(c==="trucks"){if(!r.vno)e.push("Vehicle No. zaroori hai");
    if(r.start&&r.expiry&&r.expiry<r.start)e.push("Expiry date start date se pehle nahi ho sakti");
    oth.forEach(x=>{if(x.id===nid)e.push("Ye Vehicle No. pehle se hai");["chassis","engine","policy"].forEach(k=>{if(r[k]&&x[k]===r[k])e.push(k+" duplicate ("+x.vno+")")})})}
  else{if(!r.vno)e.push("Vehicle chuniye (pehle Trucks page par truck add karein)");else if(!tOf(r.vno))e.push("Ye vehicle Trucks me nahi hai");
    if(c==="fastag"){oth.forEach(x=>{if(x.id===nid)e.push("Is vehicle ka FASTag pehle se hai");if(r.tagId&&x.tagId===r.tagId)e.push("Tag ID duplicate ("+x.vno+")")})}
    else{oth.forEach(x=>{if(x.id===nid)e.push("Ye Challan No. pehle se hai")});if(r.status==="Paid"&&!r.paidDate)r.paidDate=todayS();if(r.status!=="Paid")r.paidDate=r.paidDate}}
  if(e.length){$("msg").textContent="⚠ "+e.join(" · ");return}
  try{if(eid&&eid!==nid)await del(c,eid);await put(c,r);
    if(again){const k={...r};["vno","policy","chassis","engine","tagId","ChallanNo"].forEach(x=>c==="trucks"&&delete k[x]);if(c!=="trucks")["ChallanNo","tagId","vno"].forEach(x=>delete k[x]);openForm(c,k);$("msg").textContent="✔ Saved"}
    else closeForm()}catch(x){$("msg").textContent="Save nahi hua: "+(x.message||x.code)}}
 
/* ---------- vehicle 360 profile ---------- */
function showV(id){const t=D.trucks.find(x=>x.id===id);if(!t)return;
  const f=D.fastag.find(x=>x.id===id),cs=D.Challan.filter(x=>idOf(x.vno)===id).sort((a,b)=>a.date<b.date?1:-1),pc=cs.filter(x=>cstat(x)==="PENDING"),s=istat(t);
  const kv=(a)=>\`<div class="kv">\${a.map(x=>\`<div><span>\${x[0]}</span>\${x[1]||"—"}</div>\`).join("")}</div>\`;
  $("pm").innerHTML=\`<h2>🚚 \${esc(t.vno)} <span class="tag \${cls(s)}">\${s}</span></h2>
  <h4>TRUCK &amp; INSURANCE</h4>\${kv([["Owner",esc(t.owner)],["Insurance Co.",esc(t.company)],["Policy No.",esc(t.policy)],["Validity",fmt(t.start)+" → "+fmt(t.expiry)+" ("+(days(t)??"")+" din)"],["IDV / Premium",inr(t.idv)+" / "+inr(t.premium)],["Chassis",esc(t.chassis)],["Engine",esc(t.engine)],["Remarks",esc(t.remarks)]])}
  <h4>FASTAG</h4>\${f?kv([["Tag ID",esc(f.tagId)],["Bank",esc(f.bank)],["Balance",inr(f.balance)+" ("+fstat(f)+")"],["Last recharge",inr(f.lastAmt)+" · "+fmt(f.lastDate)]])+\`<div style="margin-top:6px"><button class="btn s" data-pg="fastag|\${esc(t.vno)}">Open FASTag page</button></div>\`:\`<div class="empty" style="padding:8px">FASTag nahi hai <button class="btn s" data-af="\${esc(t.vno)}">+ Add FASTag</button></div>\`}
  <h4>ChallanS (\${cs.length}) · Pending \${pc.length} = \${inr(pc.reduce((a,x)=>a+(+x.amount||0),0))}</h4>
  \${cs.length?\`<div class="tw"><table>\${cs.map(x=>\`<tr><td>\${esc(x.ChallanNo)}</td><td>\${fmt(x.date)}</td><td>\${esc(x.offence)}</td><td>\${inr(x.amount)}</td><td><span class="tag \${cls(cstat(x))}">\${cstat(x)}</span></td></tr>\`).join("")}</table></div>\`:\`<div class="empty" style="padding:8px">Koi Challan nahi ✔</div>\`}
  <div class="row" style="margin-top:6px"><button class="btn s" data-ac="\${esc(t.vno)}">+ Add Challan</button><button class="btn s" data-pg="Challan|\${esc(t.vno)}">Open Challan page</button></div>
  <div class="row" style="margin-top:14px;justify-content:flex-end"><button class="btn" data-pg="trucks|\${esc(t.vno)}">Open in Trucks</button><button class="btn p" id="pcl">Close</button></div>\`;
  $("pv").classList.add("on")}
function goTab(t,q,s){$("pv").classList.remove("on");tab=t;if($("q"))$("q").value=q||"";$("fs").innerHTML=\`<option value="">All Status</option>\`+OPT[t].map(o=>\`<option>\${o}</option>\`).join("");$("fs").value=s||"";if($("fc"))$("fc").value="";render();window.scrollTo(0,0)}
 
/* ---------- import / export ---------- */
function toISO(v){if(v instanceof Date&&!isNaN(v))return iso(v);const s=String(v||"").trim();let m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return m[1]+"-"+m[2]+"-"+m[3];
  m=s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/);return m?m[3]+"-"+pad(m[2])+"-"+pad(m[1]):""}
async function importFile(file){
  try{const wb=XLSX.read(await file.arrayBuffer(),{cellDates:true});let n=0;const hasT=wb.SheetNames.some(s=>/truck/i.test(s));
    for(const [si,name] of wb.SheetNames.entries()){const c=/fastag/i.test(name)?"fastag":/Challan/i.test(name)?"Challan":(/truck/i.test(name)||(!hasT&&si===0))?"trucks":null;if(!c)continue;
      const a=XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,raw:true,defval:""}),kl=SC[c].f[c==="Challan"?0:0][1].toLowerCase().replace(/\.$/,"");
      const hi=a.findIndex(r=>r.some(x=>String(x).toLowerCase().replace(/\.$/,"")===kl||(c==="trucks"&&/vehicle no/i.test(String(x)))));if(hi<0)continue;
      const lab={};SC[c].f.forEach(f=>lab[f[1].toLowerCase()]=f);const map=a[hi].map(h=>lab[String(h).trim().toLowerCase()]||lab[String(h).trim().toLowerCase()+"."]);
      for(const r of a.slice(hi+1)){const o={};map.forEach((f,i)=>{if(f)o[f[0]]=f[2]==="date"?toISO(r[i]):r[i]});
        if(!String(o[SC[c].f[0][0]]||"").trim())continue;if(c!=="trucks"&&!o.vno&&c==="fastag")continue;await put(c,o);n++}}
    toast(n+" record(s) import ho gaye.")}catch(e){toast("Import error: "+e.message)}}
async function exportXlsx(){
  const wb=XLSX.utils.book_new(),X={trucks:["TRUCK DATA",r=>[days(r),istat(r)],["Days Remaining","Status"]],fastag:["FASTAG",r=>[tOf(r.vno)?.owner||"",fstat(r)],["Owner","Alert Status"]],Challan:["Challan",r=>[tOf(r.vno)?.owner||""],["Owner"]]};
  for(const c of ["trucks","fastag","Challan"]){const [nm,ex,eh]=X[c],h=["S.No",...SC[c].f.map(f=>f[1]),...eh];
    const d=[...D[c]].sort((a,b)=>String(a[SC[c].f[0][0]])>String(b[SC[c].f[0][0]])?1:-1).map((r,i)=>[i+1,...SC[c].f.map(f=>f[2]==="date"?fmt(r[f[0]]):r[f[0]]),...ex(r)]);
    const ws=XLSX.utils.aoa_to_sheet([h,...d]);ws["!cols"]=h.map(x=>({wch:Math.max(12,x.length+4)}));XLSX.utils.book_append_sheet(wb,ws,nm)}
  const data=XLSX.write(wb,{type:"array",bookType:"xlsx"});
  try{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([data],{type:"application/octet-stream"}));a.download="FLEET_DATA.xlsx";document.body.appendChild(a);a.click();a.remove()}catch(e){}}
 
/* ---------- events ---------- */
$("add").onclick=()=>openForm(tab);$("cx").onclick=closeForm;if($("sv"))$("sv").onclick=()=>save(false);if($("sn"))$("sn").onclick=()=>save(true);
if($("imp"))$("imp").onclick=()=>$("file").click();if($("file"))$("file").onchange=e=>{if(e.target.files[0])importFile(e.target.files[0]);e.target.value=""};if($("exp"))$("exp").onclick=exportXlsx;
["q","fs","fc"].forEach(i=>{if($(i))$(i).oninput=render});
if($("nav"))$("nav").onclick=e=>{const t=e.target.closest("button")?.dataset.t;if(t)goTab(t)};
if($("kpis"))$("kpis").onclick=e=>{const k=e.target.closest(".kpi");if(k){$("fs").value=k.dataset.s;render()}};
if($("th"))$("th").onclick=e=>{const k=e.target.closest("th")?.dataset.k;if(!k)return;sortD[tab]=sortK[tab]===k?-sortD[tab]:1;sortK[tab]=k;render()};
if($("ov"))$("ov").onclick=e=>{if(e.target.id==="ov")closeForm()};
if($("pv"))$("pv").onclick=e=>{if(e.target.id==="pv"||e.target.id==="pcl")$("pv").classList.remove("on")};
document.addEventListener("click",e=>{const t=e.target.closest("[data-go],[data-v],[data-af],[data-ac],[data-pg]");if(!t)return;
  if(t.dataset.go){const [a,b,c]=t.dataset.go.split("|");goTab(a,b,c)}
  else if(t.dataset.v)showV(t.dataset.v);
  else if(t.dataset.af){$("pv").classList.remove("on");tab="fastag";if($("q"))$("q").value="";render();openForm("fastag",{vno:t.dataset.af,status:"Active",minBal:1000})}
  else if(t.dataset.ac){$("pv").classList.remove("on");tab="Challan";if($("q"))$("q").value="";render();openForm("Challan",{vno:t.dataset.ac,date:todayS(),status:"Pending"})}
  else if(t.dataset.pg){const [a,b]=t.dataset.pg.split("|");goTab(a,b)}});
if($("tb"))$("tb").onclick=async e=>{const b=e.target.closest("button[data-a]");if(!b)return;const id=b.dataset.i,a=b.dataset.a,r=D[tab].find(x=>x.id===id);if(!r)return;
  if(a==="e")openForm(tab,r,id);
  else if(a==="r"){const s=r.expiry?addDay(r.expiry,1):"";openForm("trucks",{...r,start:s,expiry:s?addDay(addYear(s,1),-1):"",policy:""},id,{title:"Renew – "+r.vno+" (nayi policy details bharein)"})}
  else if(a==="rc")openForm("fastag",{amt:"",date:todayS()},id,{title:"Recharge – "+r.vno+" (balance: "+inr(r.balance)+")",fields:[["amt","Recharge Amount (₹)","number"],["date","Recharge Date","date"]],
    save:async o=>{const m=+o.amt;if(!(m>0))throw new Error("Amount daaliye");await put("fastag",{...r,balance:(+r.balance||0)+m,lastAmt:m,lastDate:o.date||todayS()})}});
  else if(a==="pd"){await put("Challan",{...r,status:"Paid",paidDate:todayS()})}
  else if(a==="d"){if(delArm===id){delArm=null;
      if(tab==="trucks"&&(D.fastag.some(x=>x.id===id)||D.Challan.some(x=>idOf(x.vno)===id))){toast("Pehle is truck ka FASTag/Challan hatayein");render();return}
      await del(tab,id)}else{delArm=id;render();setTimeout(()=>{if(delArm===id){delArm=null;render()}},3000);return}render()}};
init();
</script>
`;

const cssMatch = inputHtml.match(/<style>([\s\S]*?)<\/style>/);
let css = cssMatch ? cssMatch[1] : '';

css = css.replace(/(^|\})\s*([^\{\}]+)\s*\{/g, (match, prefix, selectors) => {
  if (selectors.trim().startsWith('@')) return match;
  if (selectors.trim() === ':root') return match.replace(':root', '.fleet-wrapper');
  const scopedSelectors = selectors.split(',').map(s => {
    const ts = s.trim();
    if (ts === 'body' || ts === 'html') return '.fleet-wrapper';
    if (ts.startsWith(':root')) return ts.replace(':root', '.fleet-wrapper');
    return '.fleet-wrapper ' + ts;
  }).join(', ');
  return prefix + scopedSelectors + '{';
});

css = css.replace(/--pri:#[0-9a-fA-F]+/g, '--pri:#dc2626').replace(/--pri2:#[0-9a-fA-F]+/g, '--pri2:#fee2e2');

const bodyMatch = inputHtml.match(/<body>([\s\S]*?)<script>/);
const bodyHtml = bodyMatch ? bodyMatch[1] : '';

const jsMatch = inputHtml.match(/<script>([\s\S]*?)<\/script>/);
let js = jsMatch ? jsMatch[1] : '';

// encode base64
const b64Js = Buffer.from(js).toString('base64');
const b64Html = Buffer.from(bodyHtml).toString('base64');

fs.writeFileSync('c:/Users/acer/Desktop/Jay-Bhole-Master-System/Master-System/src/TransportSystem/src/pages/PurchaseTruck.css', css);

const reactCode = `import React, { useEffect, useRef } from 'react';
import './PurchaseTruck.css';

export default function PurchaseTruck({ defaultTab }) {
  const containerRef = useRef(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    window.__START_TAB = defaultTab || "trucks";
    const htmlStr = decodeURIComponent(escape(atob("${b64Html}")));
    containerRef.current.innerHTML = htmlStr;
    
    if (!document.getElementById('xlsx-script')) {
      const script = document.createElement('script');
      script.id = 'xlsx-script';
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      document.body.appendChild(script);
    }
    
    const jsStr = decodeURIComponent(escape(atob("${b64Js}")));
    
    const execute = new Function('containerRef', 'window', \`
      const document = {
        getElementById: id => containerRef.current.querySelector('#' + id),
        querySelectorAll: sel => containerRef.current.querySelectorAll(sel),
        addEventListener: window.addEventListener.bind(window),
        createElement: window.document.createElement.bind(window.document),
        body: window.document.body
      };
      
      \${jsStr}
    \`);
    
    setTimeout(() => {
      if(window.XLSX) {
        try { execute(containerRef, window); } catch(e) { console.error(e); }
      } else {
        setTimeout(() => { try { execute(containerRef, window); } catch(e) { console.error(e); } }, 500);
      }
    }, 100);
    
  }, []);

  return (
    <div className="fleet-wrapper" style={{ height: 'calc(100vh - 100px)', overflowY: 'auto' }}>
      <div ref={containerRef}></div>
    </div>
  );
}
`;

fs.writeFileSync('c:/Users/acer/Desktop/Jay-Bhole-Master-System/Master-System/src/TransportSystem/src/pages/PurchaseTruck.jsx', reactCode);

console.log("Done");
