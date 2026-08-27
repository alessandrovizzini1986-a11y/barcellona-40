'use strict';

/* ============================================================
   SCHEDA — giovedì, full body, solo macchinari, RPE 7-8
   repMin/repMax definiscono la doppia progressione.
   ============================================================ */
const ESERCIZI = [
  { id:'leg-press', nome:'Leg Press', serie:3, repMin:10, repMax:12, rec:90,
    muscoli:'Quadricipiti, glutei, femorali',
    come:'Siediti con la schiena e il bacino ben appoggiati allo schienale. Piedi a larghezza spalle sulla pedana, punte leggermente in fuori. Scendi controllando finché le ginocchia arrivano a circa 90°, senza staccare il bacino. Spingi con tutta la pianta del piede e fermati poco prima di bloccare le ginocchia.' },
  { id:'lat-machine', nome:'Lat Machine presa larga', serie:3, repMin:10, repMax:12, rec:90,
    muscoli:'Dorsali, bicipiti',
    come:'Presa più larga delle spalle, cosce bloccate sotto il cuscinetto. Petto in fuori e leggera inclinazione indietro del busto. Tira la sbarra verso la parte alta del petto pensando di portare i gomiti verso il basso, non di piegare le braccia. Risali controllando, senza far scappare le spalle verso le orecchie.' },
  { id:'chest-press', nome:'Chest Press machine', serie:3, repMin:10, repMax:12, rec:90,
    muscoli:'Petto, tricipiti',
    come:'Regola il sedile in modo che le maniglie siano all’altezza della metà del petto. Scapole appoggiate e leggermente strette. Spingi in avanti fino quasi a distendere le braccia, senza bloccare i gomiti. Torna indietro controllando finché senti il petto in allungamento, senza sbattere i pesi.' },
  { id:'seated-row', nome:'Seated Row machine', serie:3, repMin:10, repMax:12, rec:90,
    muscoli:'Dorsali, romboidi',
    come:'Petto appoggiato al supporto, schiena dritta, spalle basse. Tira le maniglie verso i fianchi stringendo le scapole a fine movimento. Non usare la spinta delle gambe né oscillare col busto. Rilascia lentamente lasciando allungare i dorsali.' },
  { id:'shoulder-press', nome:'Shoulder Press machine', serie:2, repMin:10, repMax:12, rec:75,
    muscoli:'Spalle, tricipiti',
    come:'Sedile regolato in modo che le maniglie partano all’altezza delle spalle. Schiena appoggiata, addome contratto per non inarcare la zona lombare. Spingi verso l’alto senza bloccare i gomiti e scendi controllando fino all’altezza delle orecchie.' },
  { id:'leg-curl', nome:'Leg Curl', serie:2, repMin:12, repMax:15, rec:60,
    muscoli:'Femorali',
    come:'Regola il rullo appena sopra i talloni e l’asse della macchina in linea con le ginocchia. Fletti le gambe portando i talloni verso i glutei, con una breve pausa nel punto di massima contrazione. Torna su lentamente senza far cadere il peso e senza staccare il bacino.' },
  { id:'crunch', nome:'Crunch machine', serie:2, repMin:15, repMax:15, rec:60,
    muscoli:'Addominali',
    come:'Schiena appoggiata, mani sulle maniglie. Arrotola il busto avvicinando lo sterno al bacino: è un movimento corto, non una flessione dell’anca. Espira mentre chiudi, risali controllando senza scaricare completamente la tensione.' }
];

const SERIE_TOTALI = ESERCIZI.reduce((s, e) => s + e.serie, 0);

const K_DATI  = 'palestra_dati_v1';
const K_TIMER = 'palestra_timer_v1';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

/* ============================================================
   Stato
   ============================================================ */
function statoVuoto(){ return { v:1, sessioni:[] }; }

function carica(){
  try{
    const g = JSON.parse(localStorage.getItem(K_DATI) || 'null');
    if (g && Array.isArray(g.sessioni)) return g;
  }catch(e){ console.warn('dati illeggibili, riparto da zero', e); }
  return statoVuoto();
}

let dati = carica();

function salva(){
  try{ localStorage.setItem(K_DATI, JSON.stringify(dati)); }
  catch(e){ console.error('salvataggio fallito', e); }
}

const oggiISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

function serieVuote(es){
  return Array.from({ length: es.serie }, () => ({ kg:null, reps:null, fatta:false }));
}

/** Sessione di oggi ancora aperta; la crea se non esiste. */
function sessioneOggi(){
  let s = dati.sessioni.find(x => x.data === oggiISO() && !x.chiusa);
  if (!s){
    s = { id: `${oggiISO()}-${dati.sessioni.length}`, data: oggiISO(), chiusa:false, esercizi:{} };
    dati.sessioni.push(s);
  }
  for (const es of ESERCIZI){
    if (!Array.isArray(s.esercizi[es.id]) || s.esercizi[es.id].length !== es.serie){
      s.esercizi[es.id] = serieVuote(es);
    }
  }
  return s;
}

const sessioniChiuse = () =>
  dati.sessioni.filter(s => s.chiusa).sort((a,b) => a.data < b.data ? -1 : 1);

/** Ultima sessione chiusa con almeno una serie fatta per quell'esercizio. */
function ultimaCon(idEs){
  const chiuse = sessioniChiuse();
  for (let i = chiuse.length - 1; i >= 0; i--){
    const set = chiuse[i].esercizi?.[idEs];
    if (Array.isArray(set) && set.some(x => x.fatta && x.reps)) return { sess: chiuse[i], set };
  }
  return null;
}

/** Doppia progressione: tutte le serie fatte al massimo del range → sali di carico. */
function devoSalire(es){
  const u = ultimaCon(es.id);
  if (!u) return false;
  const fatte = u.set.filter(x => x.fatta && x.reps);
  return fatte.length === es.serie && fatte.every(x => x.reps >= es.repMax);
}

const volumeSerie = set =>
  (set || []).reduce((t,x) => t + (x.fatta && x.kg && x.reps ? x.kg * x.reps : 0), 0);

const volumeSessione = s =>
  ESERCIZI.reduce((t,es) => t + volumeSerie(s.esercizi?.[es.id]), 0);

const serieFatte = s =>
  ESERCIZI.reduce((t,es) => t + (s.esercizi?.[es.id] || []).filter(x => x.fatta).length, 0);

/* Numeri: l'utente scrive "72,5" — accettiamo sia virgola sia punto. */
function leggiNum(v){
  const n = parseFloat(String(v).replace(',', '.').trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}
const mostraNum = n => n == null ? '' : String(n).replace('.', ',');
const arrotonda = n => Math.round(n * 10) / 10;

/* ============================================================
   Timer di recupero — basato su timestamp, non su setInterval,
   così resta corretto anche se lo schermo si blocca.
   ============================================================ */
const CIRC = 2 * Math.PI * 27;
let timer = { fineA:null, durata:0, suonato:false };
let tickId = null;
let audioCtx = null;
let wakeLock = null;

function caricaTimer(){
  try{
    const t = JSON.parse(localStorage.getItem(K_TIMER) || 'null');
    if (t && t.fineA && t.fineA > Date.now()){
      timer = { fineA:t.fineA, durata:t.durata, suonato:false };
      avviaTick();
    }
  }catch(e){ /* timer non ripristinabile: pazienza */ }
}

const salvaTimer = () => {
  try{
    if (timer.fineA) localStorage.setItem(K_TIMER, JSON.stringify({ fineA:timer.fineA, durata:timer.durata }));
    else localStorage.removeItem(K_TIMER);
  }catch(e){}
};

function sbloccaAudio(){
  try{
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }catch(e){}
}

function bip(){
  if (!audioCtx) return;
  const t0 = audioCtx.currentTime;
  [0, .22, .44].forEach((off, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = i === 2 ? 1170 : 880;
    gain.gain.setValueAtTime(0, t0 + off);
    gain.gain.linearRampToValueAtTime(.32, t0 + off + .02);
    gain.gain.exponentialRampToValueAtTime(.0008, t0 + off + .18);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t0 + off);
    osc.stop(t0 + off + .2);
  });
}

async function prendiWakeLock(){
  try{
    if ('wakeLock' in navigator && !wakeLock) wakeLock = await navigator.wakeLock.request('screen');
  }catch(e){}
}
function mollaWakeLock(){
  try{ wakeLock?.release(); }catch(e){}
  wakeLock = null;
}

function avviaTimer(sec){
  sbloccaAudio();
  timer = { fineA: Date.now() + sec * 1000, durata: sec, suonato:false };
  salvaTimer();
  prendiWakeLock();
  avviaTick();
  disegnaTimer();
}

function fermaTimer(){
  timer = { fineA:null, durata:0, suonato:false };
  salvaTimer();
  mollaWakeLock();
  if (tickId){ clearInterval(tickId); tickId = null; }
  const el = $('#timer');
  el.hidden = true;
  el.removeAttribute('data-fine');
}

function avviaTick(){
  if (tickId) clearInterval(tickId);
  tickId = setInterval(disegnaTimer, 200);
}

function disegnaTimer(){
  const el = $('#timer');
  if (!timer.fineA){ el.hidden = true; return; }

  const restaMs = timer.fineA - Date.now();
  el.hidden = false;

  if (restaMs <= 0){
    if (!timer.suonato){
      timer.suonato = true;
      bip();
      try{ navigator.vibrate?.([220, 90, 220, 90, 320]); }catch(e){}
      mollaWakeLock();
    }
    el.dataset.fine = '1';
    $('#timerNum').textContent = 'Vai!';
    $('#timerLab').textContent = 'recupero finito';
    $('#anelloFg').style.strokeDashoffset = '0';
    return;
  }

  el.removeAttribute('data-fine');
  const resta = Math.ceil(restaMs / 1000);
  $('#timerNum').textContent = `${Math.floor(resta/60)}:${String(resta%60).padStart(2,'0')}`;
  $('#timerLab').textContent = `recupero ${timer.durata}s`;
  $('#anelloFg').style.strokeDashoffset = String(CIRC * (1 - restaMs / (timer.durata*1000)));
}

/* Tornando dall'app in background il countdown va ricalcolato subito. */
document.addEventListener('visibilitychange', () => {
  if (!document.hidden){
    disegnaTimer();
    if (timer.fineA && !tickId) avviaTick();
  }
});

/* ============================================================
   Render — allenamento
   ============================================================ */
function renderAllenamento(){
  const s = sessioneOggi();
  const lista = $('#listaEsercizi');
  lista.innerHTML = '';

  ESERCIZI.forEach((es, i) => {
    const set = s.esercizi[es.id];
    const u = ultimaCon(es.id);
    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.es = es.id;
    if (set.every(x => x.fatta)) card.dataset.completo = '1';

    const range = es.repMin === es.repMax ? `${es.repMax}` : `${es.repMin}-${es.repMax}`;

    let html = `
      <div class="card-testa">
        <div class="num">${i+1}</div>
        <div class="card-tit">
          <h2 class="card-nome">${es.nome}</h2>
          <p class="card-musc">${es.serie}×${range} · rec ${es.rec}s · ${es.muscoli}</p>
        </div>
        <button type="button" class="info" data-info="${es.id}" aria-label="Come si esegue ${es.nome}">ⓘ</button>
      </div>`;

    if (devoSalire(es)) html += `<div class="badge">▲ SALI DI CARICO +2,5-5%</div>`;

    if (u){
      const dett = u.set.filter(x => x.fatta && x.reps)
        .map(x => `${mostraNum(x.kg) || '—'}×${x.reps}`).join('  ·  ');
      html += `<p class="ultima">Ultima (${dataBreve(u.sess.data)}): <b>${dett}</b></p>`;
    } else {
      html += `<p class="ultima">Prima volta: parti leggero e trova il carico.</p>`;
    }

    html += '<div class="serie">';
    set.forEach((x, j) => {
      html += `
        <div class="riga" data-serie="${j}" ${x.fatta ? 'data-fatta="1"' : ''}>
          <span class="riga-n">${j+1}</span>
          <label class="campo">
            <span class="campo-eti">Carico</span>
            <input type="text" inputmode="decimal" enterkeyhint="next" data-campo="kg"
                   value="${mostraNum(x.kg)}" placeholder="—" aria-label="Carico serie ${j+1}">
            <span class="campo-un">kg</span>
          </label>
          <label class="campo">
            <span class="campo-eti">Ripetizioni</span>
            <input type="text" inputmode="numeric" enterkeyhint="done" data-campo="reps"
                   value="${x.reps ?? ''}" placeholder="—" aria-label="Ripetizioni serie ${j+1}">
            <span class="campo-un">rip</span>
          </label>
          <button type="button" class="fatta" data-fatta-btn
                  aria-pressed="${x.fatta}" aria-label="Segna serie ${j+1} come fatta">✓</button>
        </div>`;
    });
    html += '</div>';

    html += `<button type="button" class="btn-rec" data-rec="${es.rec}">⏱ Avvia recupero ${es.rec}s</button>`;

    card.innerHTML = html;
    lista.appendChild(card);
  });

  aggiornaTeste();
}

function dataBreve(iso){
  const [a,m,g] = iso.split('-');
  return `${g}/${m}`;
}

/** Barra di avanzamento, volume e stato del bottone di chiusura. */
function aggiornaTeste(){
  const s = sessioneOggi();
  const fatte = serieFatte(s);
  const vol = volumeSessione(s);
  $('#volOggi').textContent = vol ? Math.round(vol).toLocaleString('it-IT') : '0';
  $('#avanzBarra').style.width = `${(fatte / SERIE_TOTALI) * 100}%`;
  $('#avanzTxt').textContent = `${fatte} di ${SERIE_TOTALI} serie completate`;
  const btn = $('#btnChiudi');
  btn.disabled = fatte === 0;
  btn.textContent = fatte === 0 ? 'Completa almeno una serie' : `Chiudi la sessione (${fatte} serie)`;
}

/* ============================================================
   Interazioni allenamento (delegate: gli input non vengono
   ri-renderizzati, così il cursore non salta mentre scrivi)
   ============================================================ */
$('#listaEsercizi').addEventListener('input', ev => {
  const inp = ev.target.closest('input[data-campo]');
  if (!inp) return;
  const idEs = inp.closest('.card').dataset.es;
  const j = +inp.closest('.riga').dataset.serie;
  const s = sessioneOggi();
  const x = s.esercizi[idEs][j];
  if (inp.dataset.campo === 'kg') x.kg = leggiNum(inp.value);
  else x.reps = leggiNum(inp.value) ? Math.round(leggiNum(inp.value)) : null;
  salva();
  aggiornaTeste();
});

$('#listaEsercizi').addEventListener('click', ev => {
  const card = ev.target.closest('.card');

  const bInfo = ev.target.closest('[data-info]');
  if (bInfo){ apriInfo(bInfo.dataset.info); return; }

  const bRec = ev.target.closest('[data-rec]');
  if (bRec){ avviaTimer(+bRec.dataset.rec); return; }

  const bFatta = ev.target.closest('[data-fatta-btn]');
  if (bFatta && card){
    const riga = bFatta.closest('.riga');
    const idEs = card.dataset.es;
    const es = ESERCIZI.find(e => e.id === idEs);
    const j = +riga.dataset.serie;
    const s = sessioneOggi();
    const x = s.esercizi[idEs][j];

    x.fatta = !x.fatta;
    /* Ripetizioni non compilate: quando spunti, assumiamo il minimo del range. */
    if (x.fatta && !x.reps){
      x.reps = es.repMin;
      riga.querySelector('[data-campo="reps"]').value = String(es.repMin);
    }
    salva();

    riga.toggleAttribute('data-fatta', x.fatta);
    bFatta.setAttribute('aria-pressed', String(x.fatta));
    card.toggleAttribute('data-completo', s.esercizi[idEs].every(y => y.fatta));
    aggiornaTeste();

    /* Spuntare una serie fa partire il recupero: è il gesto naturale in palestra. */
    if (x.fatta) avviaTimer(es.rec);
  }
});

$$('[data-manuale]').forEach(b =>
  b.addEventListener('click', () => avviaTimer(+b.dataset.manuale)));

$('#timerStop').addEventListener('click', fermaTimer);

$('#btnChiudi').addEventListener('click', () => {
  const s = sessioneOggi();
  const fatte = serieFatte(s);
  if (!fatte) return;
  if (!confirm(`Chiudere la sessione con ${fatte} serie e ${Math.round(volumeSessione(s)).toLocaleString('it-IT')} kg di volume?\n\nFinisce nello storico e domani riparti da una scheda pulita.`)) return;
  s.chiusa = true;
  s.chiusaIl = new Date().toISOString();
  salva();
  renderAllenamento();
  renderStorico();
  vaiA('storico');
});

/* ============================================================
   Popup descrizione
   ============================================================ */
function apriInfo(id){
  const es = ESERCIZI.find(e => e.id === id);
  if (!es) return;
  const range = es.repMin === es.repMax ? `${es.repMax}` : `${es.repMin}-${es.repMax}`;
  $('#modaleTit').textContent = es.nome;
  $('#modaleMuscoli').textContent = es.muscoli;
  $('#modaleCome').textContent = es.come;
  $('#modaleSchema').textContent =
    `${es.serie} serie da ${range} ripetizioni, recupero ${es.rec} secondi. RPE 7-8: fermati con 2-3 ripetizioni ancora disponibili, mai a cedimento. Quando tutte le serie arrivano a ${es.repMax} ripetizioni pulite, aumenta il carico del 2,5-5% e riparti da ${es.repMin}.`;
  const m = $('#modale');
  if (typeof m.showModal === 'function') m.showModal(); else m.setAttribute('open','');
}
$('#modaleX').addEventListener('click', () => $('#modale').close());
$('#modale').addEventListener('click', ev => { if (ev.target.id === 'modale') $('#modale').close(); });

/* ============================================================
   Render — storico
   ============================================================ */
function renderStorico(){
  const chiuse = sessioniChiuse();
  $('#storicoVuoto').hidden = chiuse.length > 0;
  $('#storicoCorpo').hidden = chiuse.length === 0;
  if (!chiuse.length) return;

  disegnaGrafico(chiuse.slice(-12));

  const lista = $('#listaSessioni');
  lista.innerHTML = '';
  [...chiuse].reverse().forEach((s, idx) => {
    const vol = Math.round(volumeSessione(s));
    const el = document.createElement('article');
    el.className = 'sess';
    let righe = '';
    ESERCIZI.forEach(es => {
      const set = (s.esercizi?.[es.id] || []).filter(x => x.fatta && x.reps);
      if (!set.length) return;
      righe += `<div class="sess-riga"><div>${es.nome}</div><span>${
        set.map(x => `${mostraNum(x.kg) || '—'}×${x.reps}`).join(' · ')}</span></div>`;
    });
    el.innerHTML = `
      <button type="button" class="sess-testa" data-apri="${idx}" aria-expanded="false">
        <div>
          <div class="sess-data">${dataLunga(s.data)}</div>
          <div class="sess-meta">${serieFatte(s)} serie</div>
        </div>
        <div class="sess-vol"><b>${vol.toLocaleString('it-IT')}</b><span>kg volume</span></div>
      </button>
      <div class="sess-corpo" hidden>${righe || '<div class="sess-riga">Nessuna serie registrata</div>'}</div>`;
    lista.appendChild(el);
  });
}

function dataLunga(iso){
  const [a,m,g] = iso.split('-').map(Number);
  const d = new Date(a, m-1, g);
  const s = d.toLocaleDateString('it-IT', { weekday:'long', day:'numeric', month:'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

$('#listaSessioni').addEventListener('click', ev => {
  const b = ev.target.closest('[data-apri]');
  if (!b) return;
  const corpo = b.nextElementSibling;
  const aperto = !corpo.hidden;
  corpo.hidden = aperto;
  b.setAttribute('aria-expanded', String(!aperto));
});

/* ------------------------------------------------------------
   Grafico: una sola serie (il volume), quindi nessuna legenda —
   il titolo la nomina. Barre sottili con estremità arrotondata
   ancorate alla base, assi discreti, valore scritto solo
   sull'ultima barra e sul massimo per non ripetere numeri ovunque.
   ------------------------------------------------------------ */
function disegnaGrafico(sessioni){
  const dati_ = sessioni.map(s => ({ data:s.data, vol:Math.round(volumeSessione(s)) }));
  const max = Math.max(...dati_.map(d => d.vol), 1);
  const idxMax = dati_.findIndex(d => d.vol === max);

  const H = 168, PAD_SU = 22, PAD_GIU = 26;
  const largBarra = 28, gap = 12;
  const W = Math.max(dati_.length * (largBarra + gap) + gap, 300);
  const alt = H - PAD_SU - PAD_GIU;

  let svg = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img"
    aria-label="Volume per sessione: ${dati_.map(d => `${dataBreve(d.data)} ${d.vol} kg`).join(', ')}">`;

  /* griglia: solo due riferimenti, restano sullo sfondo */
  [0.5, 1].forEach(f => {
    const y = PAD_SU + alt * (1 - f);
    svg += `<line class="barra-griglia" x1="0" y1="${y}" x2="${W}" y2="${y}"/>`;
  });

  dati_.forEach((d, i) => {
    const h = Math.max((d.vol / max) * alt, 3);
    const x = gap + i * (largBarra + gap);
    const y = PAD_SU + alt - h;
    const ultimo = i === dati_.length - 1;
    const colore = ultimo ? '#ff7a3d' : '#a8552c';
    svg += `<rect x="${x}" y="${y}" width="${largBarra}" height="${h}" rx="4" fill="${colore}"/>`;
    if (ultimo || i === idxMax){
      svg += `<text class="barra-val" x="${x + largBarra/2}" y="${y - 6}" text-anchor="middle">${d.vol.toLocaleString('it-IT')}</text>`;
    }
    svg += `<text class="barra-eti" x="${x + largBarra/2}" y="${H - 9}" text-anchor="middle">${dataBreve(d.data)}</text>`;
  });

  svg += '</svg>';
  $('#grafico').innerHTML = svg;

  const primo = dati_[0].vol, ultimo = dati_[dati_.length - 1].vol;
  let nota = `${dati_.length} session${dati_.length === 1 ? 'e' : 'i'} · massimo ${max.toLocaleString('it-IT')} kg`;
  if (dati_.length > 1 && primo > 0){
    const delta = Math.round(((ultimo - primo) / primo) * 100);
    nota += ` · ${delta >= 0 ? '+' : ''}${delta}% dalla prima mostrata`;
  }
  $('#grafNota').textContent = nota;
}

/* ============================================================
   Backup
   ============================================================ */
function esito(msg, err){
  const p = $('#datiEsito');
  p.textContent = msg;
  p.hidden = false;
  if (err) p.dataset.err = '1'; else p.removeAttribute('data-err');
}

$('#btnEsporta').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(dati, null, 1)], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `palestra-backup-${oggiISO()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  esito(`Esportate ${dati.sessioni.length} sessioni.`);
});

$('#btnImporta').addEventListener('click', () => $('#fileImporta').click());

$('#fileImporta').addEventListener('change', async ev => {
  const f = ev.target.files?.[0];
  if (!f) return;
  try{
    const g = JSON.parse(await f.text());
    if (!g || !Array.isArray(g.sessioni)) throw new Error('formato non riconosciuto');
    if (!confirm(`Il file contiene ${g.sessioni.length} sessioni.\n\nSostituisce TUTTI i dati attuali (${dati.sessioni.length} sessioni). Procedere?`)) return;
    dati = { v:1, sessioni:g.sessioni };
    salva();
    renderAllenamento();
    renderStorico();
    esito(`Importate ${g.sessioni.length} sessioni.`);
  }catch(e){
    esito(`File non valido: ${e.message}`, true);
  }finally{
    ev.target.value = '';
  }
});

/* ============================================================
   Tab
   ============================================================ */
function vaiA(tab){
  $('#vistaAllenamento').hidden = tab !== 'allenamento';
  $('#vistaStorico').hidden = tab !== 'storico';
  $$('.tab').forEach(b => b.classList.toggle('attiva', b.dataset.tab === tab));
  if (tab === 'storico') renderStorico();
  aggiornaTesta(tab);
  window.scrollTo({ top:0 });
}

/* L'intestazione parla della tab che stai guardando: volume e barra di
   avanzamento riguardano l'allenamento di oggi, nello storico non c'entrano. */
function aggiornaTesta(tab){
  const storico = tab === 'storico';
  $('#testaVol').hidden = storico;
  $('#avanzWrap').hidden = storico;
  $('#avanzTxt').hidden = storico;
  $('#testaTit').textContent = storico ? 'Storico' : 'Full Body';
  if (storico){
    const n = sessioniChiuse().length;
    $('#testaSub').textContent = n
      ? `${n} ${n === 1 ? 'sessione chiusa' : 'sessioni chiuse'} · andamento del volume`
      : 'Nessuna sessione chiusa';
  } else {
    $('#testaSub').textContent = 'Giovedì · solo macchinari · RPE 7-8';
  }
}
$$('.tab').forEach(b => b.addEventListener('click', () => vaiA(b.dataset.tab)));

/* ============================================================
   Avvio
   ============================================================ */
renderAllenamento();
renderStorico();
caricaTimer();
disegnaTimer();

if ('serviceWorker' in navigator){
  window.addEventListener('load', () =>
    navigator.serviceWorker.register('./sw.js').catch(e => console.warn('SW non registrato', e)));
}
