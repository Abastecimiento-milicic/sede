function _fmtPct(v) { if (v == null || isNaN(v)) return ""; const n = Math.round(v * 10) / 10; return n.toString().replace(".", ",") + "%"; }
function _fmtNum1(v) { if (v == null || isNaN(v)) return ""; const n = Math.round(v * 10) / 10; return n.toString().replace(".", ","); }

function makeDemoraAnnotations(xs, ys) {
  const ann = [];
  for (let i = 0; i < xs.length; i++) {
    const y = ys[i];
    if (y == null || isNaN(y)) continue;
    ann.push({
      x: xs[i],
      y: y,
      xref: "x",
      yref: "y2",
      text: Math.round(y) + " d",
      showarrow: true,
      arrowhead: 2,
      arrowsize: 1,
      arrowwidth: 1,
      ax: 0,
      ay: -18,
      bgcolor: "rgba(255,255,255,0.85)",
      bordercolor: "rgba(0,0,0,0.25)",
      borderwidth: 1,
      borderpad: 3,
      font: { size: 11, color: "#111" },
      align: "center"
    });
  }
  return ann;
}

function toNumAny(v) {
  if (v == null) return NaN;
  if (typeof v === "number") return v;
  const s = String(v).trim();
  if (!s) return NaN;
  const norm = s.replace(/\./g, "").replace(/,/g, ".");
  const n = parseFloat(norm);
  return isNaN(n) ? NaN : n;
}

/* ============================
   CONFIG
   ============================ */
const csvUrl = "./R1 - REPORTE CUMPLIMIENTO PI ACUMULADO.csv";  // nombre EXACTO para PI
const DELIM = ";";

const FECHA_COL = "FECHA ENTREGA ESPERADA";
const DEMORA_CANDIDATES = ["dDIAS RESPUESTA", "dDIAS DEMORA", "DIAS DE DEMORA"];
let DEMORA_COL = "dDIAS RESPUESTA";

function avgDelay(rows) {
  let s = 0, c = 0;
  for (const r of rows) {
    const v = toNumAny(r[DEMORA_COL]);
    if (!isNaN(v)) { s += v; c++; }
  }
  return c ? (s / c) : NaN;
}

const CLIENT_CANDIDATES = ["CLIENTE / OBRA", "CLIENTE NRO.", "CLIENTE"];

// NUEVOS FILTROS
const CENTRO_CANDIDATES = ["CENTRO"];
const CLASIF2_CANDIDATES = ["CLASIFICACION 2", "CLASIFICACIÓN 2", "CLASIFICACION2", "CLASIFICACION_2", "CLASIFICACION"];
const GCOC_CANDIDATES = ["GRUPO DE COMPRAS SOLPED", "GRUPO DE COMPRA SOLPED", "GRUPO DE COMPRA"];

const AT_COL = "RESPONDIDO AT";
const FT_COL = "RESPONDIDO FT";
const NO_COL = "NO RESPONDIDO";

/* ============================
   COLORES (TEMA AZUL PREMIUM)
   ============================ */
const COLORS = {
  blue: "#2563eb", // Azul premium
  green: "#10b981",
  amber: "#f59e0b",
  red: "#ef4444",
  grid: "rgba(15, 23, 42, 0.08)",
  text: "#0f172a",
  muted: "#64748b",
};

/* ============================
   GLOBAL
   ============================ */
let data = [];
let headers = [];

let CLIENT_COL = null;
let CENTRO_COL = null;
let CLASIF2_COL = null;
let GCOC_COL = null;

let chartMes = null;
let chartTendencia = null;

/* ============================
   HELPERS
   ============================ */
const clean = (v) => {
  let s = (v ?? "").toString().trim();
  s = s.replace(/&#160;/g, " ");
  s = s.replace(/&nbsp;/g, " ");
  return s.trim();
};

function setText(id, txt) {
  const el = document.getElementById(id);
  if (el) el.textContent = txt ?? "";
}

function setHTML(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html ?? "";
}

function toNumber(v) {
  let x = clean(v);
  if (!x) return 0;
  x = x.replace(/\s/g, "");
  if (x.includes(",")) x = x.replace(/\./g, "").replace(",", ".");
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function fmtInt(n) {
  return Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

function fmtPct01(x) {
  if (!isFinite(x)) return "-";
  return (x * 100).toFixed(1).replace(".", ",") + "%";
}

function safeFilePart(s) {
  return clean(s).replace(/[^\w\-]+/g, "_").slice(0, 80) || "Todos";
}

function showError(msg) {
  setHTML("msg", `<div class="error">${msg}</div>`);
}

/* ============================
   DATE PARSING
   ============================ */
function parseDateAny(s) {
  const t = clean(s);
  if (!t) return null;

  let m = t.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);

  m = t.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);

  return null;
}

function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthKeyFromRow(r) {
  const d = parseDateAny(r[FECHA_COL]);
  return d ? monthKey(d) : null;
}

/* ============================
   CSV parser (PapaParse optimized)
   ============================ */
function parseDelimited(text, delimiter = ";") {
  if (typeof Papa !== 'undefined') {
    const results = Papa.parse(text, {
      delimiter: delimiter,
      header: false,
      skipEmptyLines: true
    });
    return results.data;
  }
  
  const rows = text.split(/\r?\n/).filter(line => line.trim() !== "");
  return rows.map(row => {
    const cols = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '"') inQuotes = !inQuotes;
      else if (ch === delimiter && !inQuotes) { cols.push(cur); cur = ""; }
      else cur += ch;
    }
    cols.push(cur);
    return cols;
  });
}

/* ============================
   SELECT UTIL
   ============================ */
function fillSelect(selectId, values, placeholder = "Todos") {
  const sel = document.getElementById(selectId);
  if (!sel) return;

  const prevSet = new Set([...sel.selectedOptions].map(o => o.value));

  sel.innerHTML = "";

  const optAll = document.createElement("option");
  optAll.value = "__ALL__";
  optAll.textContent = placeholder;
  sel.appendChild(optAll);

  for (const v of values) {
    const o = document.createElement("option");
    o.value = v;
    const norm = clean(v).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const displayText = norm === "PANOL" ? "ALMACÉN" : v;
    o.textContent = displayText;
    sel.appendChild(o);
  }

  const hasPrev = [...prevSet].some(v => v && v !== "__ALL__");
  if (!hasPrev) {
    optAll.selected = true;
  } else {
    [...sel.options].forEach(o => {
      if (prevSet.has(o.value)) o.selected = true;
    });
    enforceAllOption(sel);
  }
}

function uniqSorted(arr) {
  return [...new Set(arr.map(clean).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
}

/* ============================
   FILTERS
   ============================ */
function enforceAllOption(sel) {
  if (!sel) return;
  const allOpt = [...sel.options].find(o => o.value === "__ALL__");
  if (!allOpt) return;

  const selected = [...sel.selectedOptions].map(o => o.value);
  if (selected.includes("__ALL__") && selected.length > 1) {
    [...sel.options].forEach(o => { o.selected = (o.value === "__ALL__"); });
    return;
  }
  if (!selected.length) {
    allOpt.selected = true;
  } else if (!selected.includes("__ALL__")) {
    allOpt.selected = false;
  }
}

function getSelValues(id) {
  const sel = document.getElementById(id);
  if (!sel) return [];
  enforceAllOption(sel);
  const vals = [...sel.selectedOptions].map(o => o.value);
  if (!vals.length) return [];
  if (vals.includes("__ALL__")) return [];
  return vals.filter(v => v !== "");
}

function selLabel(id) {
  const v = getSelValues(id);
  return v.length ? v.join("-") : "Todos";
}

const MONTH_NAMES = {
  "01": "ENERO",
  "02": "FEBRERO",
  "03": "MARZO",
  "04": "ABRIL",
  "05": "MAYO",
  "06": "JUNIO",
  "07": "JULIO",
  "08": "AGOSTO",
  "09": "SEPTIEMBRE",
  "10": "OCTUBRE",
  "11": "NOVIEMBRE",
  "12": "DICIEMBRE"
};

function updateMesTitleFromSelect() {
  const titleEl = document.getElementById("panelMesTitle");
  if (!titleEl) return;

  const ms = getSelValues("mesSelect");

  if (!ms.length) {
    titleEl.textContent = "CUMPLIMIENTO - TODOS LOS MESES";
    return;
  }

  if (ms.length > 1) {
    titleEl.textContent = "CUMPLIMIENTO - MESES SELECCIONADOS";
    return;
  }

  const [year, month] = String(ms[0]).split("-");
  const mesTxt = MONTH_NAMES[month] || month || ms[0];

  titleEl.textContent = `CUMPLIMIENTO - MES DE ${mesTxt} ${year || ""}`.trim();
}

function getSingleMes(months) {
  const ms = getSelValues("mesSelect");
  if (!months || !months.length) {
    return ms.length ? ms[ms.length - 1] : "";
  }
  if (!ms.length) return months[months.length - 1] || "";
  const set = new Set(ms);
  let last = "";
  for (const m of months) {
    if (set.has(m)) last = m;
  }
  return last || ms[ms.length - 1] || "";
}

function rowsByClienteBase() {
  const cs = getSelValues("clienteSelect");
  let rows = cs.length ? data.filter(r => cs.includes(clean(r[CLIENT_COL]))) : data;

  const centros = getSelValues("centroSelect");
  if (centros.length && CENTRO_COL) {
    rows = rows.filter(r => centros.includes(clean(r[CENTRO_COL])));
  }

  if (CLASIF2_COL) {
    const equiposNorm = "EQUIPOS MENORES".normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const almacenNorm = "ALMACEN".normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    rows = rows.map(r => {
      const val = clean(r[CLASIF2_COL]).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (val === equiposNorm || val === almacenNorm) {
        return { ...r, [CLASIF2_COL]: "ALMACÉN" };
      }
      return r;
    });
  }

  return rows;
}

function filteredRowsNoMes() {
  let rows = rowsByClienteBase();

  const c2s = getCheckedClasif2();
  if (c2s.length && CLASIF2_COL) rows = rows.filter(r => c2s.includes(clean(r[CLASIF2_COL])));
  const gcs = getSelValues("gcocSelect");
  if (gcs.length && GCOC_COL) rows = rows.filter(r => gcs.includes(clean(r[GCOC_COL])));
  return rows;
}

function filteredRowsByAll() {
  const rows = filteredRowsNoMes();
  const ms = getSelValues("mesSelect");
  if (!ms.length) return rows;
  const set = new Set(ms);
  return rows.filter(r => set.has(getMonthKeyFromRow(r)));
}

/* ============================
   SELECTS RENDERERS
   ============================ */
function renderClientes() {
  const clientes = uniqSorted(data.map(r => r[CLIENT_COL]));
  fillSelect("clienteSelect", clientes, "Todos");
}

function renderCentros(rowsBase) {
  const hint = document.getElementById("centroHint");
  if (!CENTRO_COL) {
    if (hint) hint.textContent = "Columna: (no encontrada)";
    const sel = document.getElementById("centroSelect");
    if (sel) { sel.disabled = true; sel.innerHTML = `<option value="">Todos</option>`; }
    return;
  }
  if (hint) hint.textContent = `Columna: ${CENTRO_COL}`;
  const vals = uniqSorted(rowsBase.map(r => r[CENTRO_COL]));
  const sel = document.getElementById("centroSelect");
  if (sel) sel.disabled = false;
  fillSelect("centroSelect", vals, "Todos");
}

function renderClasif2(rowsBase) {
  const hint = document.getElementById("clasif2Hint");
  if (!CLASIF2_COL) {
    if (hint) hint.textContent = "Columna: (no encontrada)";
    const sel = document.getElementById("clasif2Select");
    if (sel) { sel.disabled = true; sel.innerHTML = `<option value="">Todos</option>`; }
    return;
  }
  if (hint) hint.textContent = `Columna: ${CLASIF2_COL}`;
  const vals = uniqSorted(rowsBase.map(r => clean(r[CLASIF2_COL])));
  const sel = document.getElementById("clasif2Select");
  if (sel) sel.disabled = false;
  fillSelect("clasif2Select", vals, "Todos");
}

function getCheckedClasif2() {
  return getSelValues("clasif2Select");
}

function renderGcoc(rowsBase) {
  const hint = document.getElementById("gcocHint");
  if (!GCOC_COL) {
    if (hint) hint.textContent = "Columna: (no encontrada)";
    const sel = document.getElementById("gcocSelect");
    if (sel) { sel.disabled = true; sel.innerHTML = `<option value="">Todos</option>`; }
    return;
  }
  if (hint) hint.textContent = `Columna: ${GCOC_COL}`;
  const vals = uniqSorted(rowsBase.map(r => r[GCOC_COL]));
  const sel = document.getElementById("gcocSelect");
  if (sel) sel.disabled = false;
  fillSelect("gcocSelect", vals, "Todos");
}

function buildMesSelect(rows) {
  const sel = document.getElementById("mesSelect");
  if (!sel) return [];

  const months = [...new Set(rows.map(getMonthKeyFromRow).filter(Boolean))].sort();
  const prevSet = new Set([...sel.selectedOptions].map(o => o.value));

  sel.innerHTML = "";

  const optAll = document.createElement("option");
  optAll.value = "__ALL__";
  optAll.textContent = "Todos";
  sel.appendChild(optAll);

  for (const m of months) {
    const o = document.createElement("option");
    o.value = m;
    o.textContent = m;
    sel.appendChild(o);
  }

  const prevValid = [...prevSet].filter(v => v && v !== "__ALL__" && months.includes(v));
  if (prevValid.length) {
    [...sel.options].forEach(o => { if (prevSet.has(o.value)) o.selected = true; });
  } else {
    const last = months[months.length - 1];
    if (last) {
      const optLast = [...sel.options].find(o => o.value === last);
      if (optLast) optLast.selected = true;
    } else {
      optAll.selected = true;
    }
  }

  enforceAllOption(sel);

  const hint = document.getElementById("mesHint");
  if (hint) {
    const label = selLabel("mesSelect");
    hint.textContent = label === "Todos" ? "Mes seleccionado: Todos" : `Mes seleccionado: ${label}`;
  }

  updateMesTitleFromSelect();

  return months;
}

/* ============================
   KPI CALCS
   ============================ */
function calcTotals(rows) {
  let at = 0, ft = 0, no = 0;
  for (const r of rows) {
    at += toNumber(r[AT_COL]);
    ft += toNumber(r[FT_COL]);
    no += toNumber(r[NO_COL]);
  }
  const total = at + ft + no;
  return { at, ft, no, total };
}

function calcMonthTotals(rows, month) {
  let at = 0, ft = 0, no = 0;

  for (const r of rows) {
    if (getMonthKeyFromRow(r) !== month) continue;
    at += toNumber(r[AT_COL]);
    ft += toNumber(r[FT_COL]);
    no += toNumber(r[NO_COL]);
  }

  const total = at + ft + no;
  const pctAT = total ? at / total : NaN;
  const pctFT = total ? ft / total : NaN;
  const pctNO = total ? no / total : NaN;

  return { at, ft, no, total, pctAT, pctFT, pctNO };
}

/* ============================
   DELTAS
   ============================ */
function deltaInfo(curr, prev) {
  if (!isFinite(curr) || !isFinite(prev)) return { text: "Sin mes anterior", diff: NaN };
  const diff = curr - prev;
  const eps = 0.000001;
  if (Math.abs(diff) < eps) return { text: "• 0,0% vs mes anterior", diff: 0 };
  const arrow = diff > 0 ? "▲" : "▼";
  const txt = `${arrow} ${(Math.abs(diff) * 100).toFixed(1).replace(".", ",")}% vs mes anterior`;
  return { text: txt, diff };
}

function setDelta(el, text, cls) {
  if (!el) return;
  el.classList.remove("delta-good", "delta-bad", "delta-neutral");
  if (cls) el.classList.add(cls);
  el.textContent = text;
}

/* ============================
   KPIs UI UPDATERS
   ============================ */
function updateKPIsGeneral(rows) {
  const t = calcTotals(rows);
  const pctAT = t.total ? t.at / t.total : NaN;
  const pctFT = t.total ? t.ft / t.total : NaN;
  const pctNO = t.total ? t.no / t.total : NaN;

  setText("kpiTotal", fmtInt(t.total));

  setText("kpiATpct", fmtPct01(pctAT));
  setText("kpiATqty", `Cantidad: ${fmtInt(t.at)}`);
  const elAT = document.getElementById("kpiATpct");
  if (elAT) elAT.style.color = (isFinite(pctAT) && pctAT >= 0.78) ? "#16a34a" : "#ef4444";

  const avgG = avgDelay(rows);
  setText("kpiDemoraAvg", isNaN(avgG) ? "-" : (Math.round(avgG) + " d"));
  const elDemG = document.getElementById("kpiDemoraAvg");
  if (elDemG) elDemG.style.color = (!isNaN(avgG) && avgG > 7) ? "#ef4444" : "#16a34a";

  setText("kpiFTpct", fmtPct01(pctFT));
  setText("kpiFTqty", `Cantidad: ${fmtInt(t.ft)}`);

  setText("kpiNOpct", fmtPct01(pctNO));
  setText("kpiNOqty", `Cantidad: ${fmtInt(t.no)}`);
}

function updateKPIsMonthly(rows, months) {
  const ms = getSelValues("mesSelect");
  if (!ms.length) {
    const t = calcTotals(rows);
    const pctAT = t.total ? t.at / t.total : NaN;
    const pctFT = t.total ? t.ft / t.total : NaN;
    const pctNO = t.total ? t.no / t.total : NaN;

    setText("kpiTotalMes", fmtInt(t.total));

    setText("kpiATmes", fmtPct01(pctAT));
    const elATmes = document.getElementById("kpiATmes");
    if (elATmes) elATmes.style.color = (isFinite(pctAT) && pctAT >= 0.78) ? "#16a34a" : "#ef4444";

    setText("kpiFTmes", fmtPct01(pctFT));
    setText("kpiNOmes", fmtPct01(pctNO));

    const avgM = avgDelay(rows);
    setText("kpiDemoraMes", isNaN(avgM) ? "-" : (Math.round(avgM) + " d"));
    const elDemM = document.getElementById("kpiDemoraMes");
    if (elDemM) elDemM.style.color = (!isNaN(avgM) && avgM > 7) ? "#ef4444" : "#16a34a";

    const atSub = document.getElementById("kpiATmesSub");
    const ftSub = document.getElementById("kpiFTmesSub");
    const noSub = document.getElementById("kpiNOmesSub");

    if (atSub) atSub.textContent = `Cant: ${fmtInt(t.at)} · Todos los meses`;
    if (ftSub) ftSub.textContent = `Cant: ${fmtInt(t.ft)} · Todos los meses`;
    if (noSub) noSub.textContent = `Cant: ${fmtInt(t.no)} · Todos los meses`;
    return;
  }

  const mes = getSingleMes(months);
  if (!mes) return;

  const idx = months.indexOf(mes);
  const prevMes = idx > 0 ? months[idx - 1] : null;

  const cur = calcMonthTotals(rows, mes);
  const prev = prevMes ? calcMonthTotals(rows, prevMes) : null;

  setText("kpiTotalMes", fmtInt(cur.total));

  setText("kpiATmes", fmtPct01(cur.pctAT));
  const elATmes = document.getElementById("kpiATmes");
  if (elATmes) elATmes.style.color = (isFinite(cur.pctAT) && cur.pctAT >= 0.78) ? "#16a34a" : "#ef4444";

  setText("kpiFTmes", fmtPct01(cur.pctFT));
  setText("kpiNOmes", fmtPct01(cur.pctNO));

  const mesRows = rows.filter(r => getMonthKeyFromRow(r) === mes);
  const avgM = avgDelay(mesRows);
  setText("kpiDemoraMes", isNaN(avgM) ? "-" : (Math.round(avgM) + " d"));
  const elDemM = document.getElementById("kpiDemoraMes");
  if (elDemM) elDemM.style.color = (!isNaN(avgM) && avgM > 7) ? "#ef4444" : "#16a34a";

  const atSub = document.getElementById("kpiATmesSub");
  const ftSub = document.getElementById("kpiFTmesSub");
  const noSub = document.getElementById("kpiNOmesSub");

  if (!prev) {
    setDelta(atSub, `Cant: ${fmtInt(cur.at)} · Sin mes anterior`, "");
    setDelta(ftSub, `Cant: ${fmtInt(cur.ft)} · Sin mes anterior`, "");
    setDelta(noSub, `Cant: ${fmtInt(cur.no)} · Sin mes anterior`, "");
    return;
  }

  const dAT = deltaInfo(cur.pctAT, prev.pctAT);
  const dFT = deltaInfo(cur.pctFT, prev.pctFT);
  const dNO = deltaInfo(cur.pctNO, prev.pctNO);

  let clsAT = "delta-good";
  if (dAT.diff < 0) clsAT = "delta-bad";

  let clsFT = "delta-bad";
  if (dFT.diff < 0) clsFT = "delta-good";

  let clsNO = "delta-good";
  if (dNO.diff > 0) clsNO = "delta-bad";

  setDelta(atSub, `Cant: ${fmtInt(cur.at)} · ${dAT.text}`, clsAT);
  setDelta(ftSub, `Cant: ${fmtInt(cur.ft)} · ${dFT.text}`, clsFT);
  setDelta(noSub, `Cant: ${fmtInt(cur.no)} · ${dNO.text}`, clsNO);
}

/* ============================
   CHART 1: 100% stacked bar + línea (ECharts)
   ============================ */
function buildChartMes(rows) {
  const agg = new Map();
  const monthsSet = new Set();

  for (const r of rows) {
    const d = parseDateAny(r[FECHA_COL]);
    if (!d) continue;

    const mk = monthKey(d);
    monthsSet.add(mk);

    if (!agg.has(mk)) agg.set(mk, { at: 0, ft: 0, no: 0, demSum: 0, demCnt: 0 });
    const c = agg.get(mk);

    c.at += toNumber(r[AT_COL]);
    c.ft += toNumber(r[FT_COL]);
    c.no += toNumber(r[NO_COL]);

    const dem = toNumAny(r[DEMORA_COL]);
    if (!isNaN(dem)) { c.demSum += dem; c.demCnt += 1; }
  }

  const months = [...monthsSet].sort();
  const qAT = months.map(m => agg.get(m)?.at ?? 0);
  const qFT = months.map(m => agg.get(m)?.ft ?? 0);
  const qNO = months.map(m => agg.get(m)?.no ?? 0);

  const pAT = qAT.map((v, i) => { const t = qAT[i] + qFT[i] + qNO[i]; return t ? (v / t) * 100 : 0; });
  const pFT = qFT.map((v, i) => { const t = qAT[i] + qFT[i] + qNO[i]; return t ? (v / t) * 100 : 0; });
  const pNO = qNO.map((v, i) => { const t = qAT[i] + qFT[i] + qNO[i]; return t ? (v / t) * 100 : 0; });

  const avgDem = months.map(m => {
    const c = agg.get(m);
    return (c && c.demCnt) ? (c.demSum / c.demCnt) : null;
  });

  const pAT_acum = [];
  let sumaEntregadosATAcum = 0;
  let sumaComprometidosAcum = 0;

  for (let i = 0; i < months.length; i++) {
    const at = qAT[i];
    const comp = qAT[i] + qFT[i] + qNO[i];
    sumaEntregadosATAcum += at;
    sumaComprometidosAcum += comp;
    const pctAcum = sumaComprometidosAcum ? (sumaEntregadosATAcum / sumaComprometidosAcum) * 100 : 0;
    pAT_acum.push(pctAcum);
  }

  const el = document.getElementById("chartMes");
  if (!el || !window.echarts) return;

  if (!chartMes) chartMes = echarts.init(el, null, { renderer: "canvas" });

  const option = {
    grid: { left: 56, right: 70, top: 40, bottom: 62 },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      confine: true,
      formatter: (params) => {
        const axis = params?.[0]?.axisValue ?? "";
        let html = `<b>${axis}</b><br/>`;
        const byName = Object.fromEntries(params.map(p => [p.seriesName, p]));
        const at = byName["Respondidos AT"];
        const ft = byName["Respondidos FT"];
        const ne = byName["No respondidos"];
        const dem = byName["Promedio días de demora"];
        const acum = byName["%AT Acumulado"];

        if (at) html += `🟩 Respondidos AT: <b>${fmtInt(qAT[at.dataIndex])}</b> (${_fmtNum1(at.value)}%)<br/>`;
        if (ft) html += `🟧 Respondidos FT: <b>${fmtInt(qFT[ft.dataIndex])}</b> (${_fmtNum1(ft.value)}%)<br/>`;
        if (ne) html += `🟥 No respondidos: <b>${fmtInt(qNO[ne.dataIndex])}</b> (${_fmtNum1(ne.value)}%)<br/>`;
        if (acum && acum.value != null) html += `📈 %AT Acumulado: <b>${_fmtNum1(acum.value)}%</b><br/>`;
        if (dem && dem.value != null) html += `🔵 Demora prom.: <b>${Math.round(dem.value)}</b> días<br/>`;
        return html;
      }
    },
    legend: {
      bottom: 12,
      left: "center",
      itemWidth: 14,
      itemHeight: 10,
      textStyle: { fontWeight: 800 }
    },
    xAxis: {
      type: "category",
      data: months,
      axisTick: { alignWithLabel: true },
      axisLabel: { fontWeight: 700 }
    },
    yAxis: [
      {
        type: "value",
        min: 0,
        max: 100,
        axisLabel: { formatter: "{value}%" },
        splitLine: { lineStyle: { color: "rgba(15,23,42,0.06)" } }
      },
      {
        type: "value",
        name: "Días de demora",
        position: "right",
        axisLabel: { fontWeight: 700 },
        splitLine: { show: false },
        boundaryGap: [0, '25%']
      }
    ],
    series: [
      {
        name: "Respondidos AT",
        type: "bar",
        stack: "pct",
        data: pAT.map(v => {
          const val = +(+v).toFixed(4);
          if (val < 78) {
            return {
              value: val,
              itemStyle: {
                borderColor: '#dc2626',
                borderWidth: 2,
                borderType: 'solid',
                borderRadius: [6, 6, 0, 0]
              }
            };
          }
          return val;
        }),
        barMaxWidth: 52,
        itemStyle: { color: COLORS.green, borderRadius: [6, 6, 0, 0] },
        label: {
          show: true,
          position: "inside",
          fontWeight: 900,
          fontSize: 11,
          lineHeight: 12,
          formatter: (p) => {
            const i = p.dataIndex;
            const pct = +p.value || 0;
            const q = (qAT)[i] || 0;
            if (!q) return "";
            if (pct < 6) return "";
            const pctRound = Math.round(pct);

            if (pct < 78) {
              return `{warn|${fmtInt(q)}\n⚠ (${pctRound}%)}`;
            }
            return `${fmtInt(q)}\n(${pctRound}%)`;
          },
          rich: {
            warn: {
              fontWeight: 950,
              color: "#7f1d1d",
              backgroundColor: "rgba(254, 202, 202, 0.9)",
              borderColor: "#b91c1c",
              borderWidth: 1.5,
              borderRadius: 4,
              padding: [2, 4],
              fontSize: 11,
              lineHeight: 14,
              align: 'center'
            }
          },
          color: "#ffffff",
          backgroundColor: "rgba(0,0,0,0.15)",
          borderRadius: 4,
          padding: [2, 4]
        },
        labelLayout: { hideOverlap: true },
        emphasis: { disabled: true },
        markLine: {
          silent: true,
          symbol: ["none", "none"],
          label: {
            show: true,
            formatter: "Obj 78%",
            fontWeight: 800,
            fontSize: 11,
            position: "end",
            backgroundColor: '#1e3a8a',
            color: '#fff',
            padding: [4, 6],
            borderRadius: 4
          },
          lineStyle: { type: "dashed", width: 2, color: "#1e3a8a" },
          data: [{ yAxis: 78 }]
        },
        z: 1,
        zlevel: 0
      },
      {
        name: "Respondidos FT",
        type: "bar",
        stack: "pct",
        data: pFT.map(v => +(+v).toFixed(4)),
        barMaxWidth: 52,
        itemStyle: { color: COLORS.amber },
        label: {
          show: true,
          position: "inside",
          color: "#111",
          fontWeight: 950,
          fontSize: 11,
          lineHeight: 12,
          formatter: (p) => {
            const i = p.dataIndex;
            const pct = +p.data || 0;
            const q = (qFT)[i] || 0;
            if (!q) return "";
            if (pct < 6) return "";
            return `${fmtInt(q)}\n(${Math.round(pct)}%)`;
          }
        },
        labelLayout: { hideOverlap: true },
        emphasis: { disabled: true },
        z: 1,
        zlevel: 0
      },
      {
        name: "No respondidos",
        type: "bar",
        stack: "pct",
        data: pNO.map(v => +(+v).toFixed(4)),
        barMaxWidth: 52,
        itemStyle: { color: COLORS.red },
        label: {
          show: true,
          position: "top",
          color: COLORS.red,
          fontWeight: 900,
          fontSize: 11,
          lineHeight: 12,
          formatter: (p) => {
            const i = p.dataIndex;
            const pct = +p.data || 0;
            const q = (qNO)[i] || 0;
            if (!q) return "";
            return `${fmtInt(q)} (${Math.round(pct)}%)`;
          }
        },
        labelLayout: { hideOverlap: true },
        emphasis: { disabled: true },
        z: 1,
        zlevel: 0
      },
      {
        name: "%AT Acumulado",
        type: "line",
        data: pAT_acum.map(v => +(+v).toFixed(2)),
        showSymbol: true,
        symbol: "circle",
        symbolSize: 7,
        showAllSymbol: true,
        connectNulls: true,
        lineStyle: { width: 3, type: "solid", color: "#c084fc" },
        itemStyle: { color: "#c084fc", borderColor: "#fff", borderWidth: 2 },
        label: {
          show: true,
          position: "bottom",
          distance: 6,
          formatter: (p) => {
            const val = +p.data;
            if (val == null || isNaN(val)) return "";
            return val.toFixed(2).replace(".", ",") + "%";
          },
          backgroundColor: "rgba(255, 255, 255, 0.85)",
          padding: [2, 4],
          borderRadius: 3,
          borderColor: "rgba(192, 132, 252, 0.4)",
          borderWidth: 1,
          textStyle: { fontWeight: 850, color: "#9333ea", fontSize: 10 }
        },
        emphasis: {
          disabled: false,
          scale: false,
          label: {
            show: true,
            position: "bottom",
            formatter: (p) => {
              const val = +p.data;
              if (val == null || isNaN(val)) return "";
              return val.toFixed(2).replace(".", ",") + "%";
            },
            textStyle: { fontWeight: 850, color: "#9333ea", fontSize: 10 }
          }
        },
        z: 6
      },
      {
        name: "Promedio días de demora",
        type: "line",
        yAxisIndex: 1,
        data: avgDem,
        symbol: "circle",
        symbolSize: 7,
        showSymbol: true,
        connectNulls: true,
        lineStyle: { width: 3, color: COLORS.blue },
        itemStyle: { color: COLORS.blue, borderColor: "#fff", borderWidth: 2 },
        label: {
          show: true,
          position: "top",
          backgroundColor: "rgba(255,255,255,0.75)",
          padding: [2, 4],
          borderRadius: 4,
          fontWeight: 950,
          color: "#0b1220",
          formatter: (p) => (p.data == null || isNaN(p.data)) ? "" : `${Math.round(p.data)} d`
        },
        markLine: {
          silent: true,
          symbol: ["none", "none"],
          label: {
            show: true,
            formatter: "Lím 7 d",
            fontWeight: 800,
            fontSize: 11,
            position: "end",
            backgroundColor: '#374151',
            color: '#fff',
            padding: [4, 6],
            borderRadius: 4
          },
          lineStyle: { type: "dashed", width: 2, color: "#374151" },
          data: [{ yAxis: 7 }]
        },
        zlevel: 10,
        z: 10
      }
    ]
  };

  chartMes.setOption(option, true);
  window.addEventListener("resize", () => chartMes && chartMes.resize(), { passive: true });
}

/* ============================
   CHART 2: Trend lines (ECharts)
   ============================ */
function buildChartTendencia(rows) {
  const agg = new Map();
  const monthsSet = new Set();

  for (const r of rows) {
    const d = parseDateAny(r[FECHA_COL]);
    if (!d) continue;

    const mk = monthKey(d);
    monthsSet.add(mk);

    if (!agg.has(mk)) agg.set(mk, { at: 0, ft: 0, no: 0 });
    const c = agg.get(mk);

    c.at += toNumber(r[AT_COL]);
    c.ft += toNumber(r[FT_COL]);
    c.no += toNumber(r[NO_COL]);
  }

  const months = [...monthsSet].sort();

  const pAT = months.map(m => {
    const c = agg.get(m); const t = (c?.at ?? 0) + (c?.ft ?? 0) + (c?.no ?? 0);
    return t ? ((c.at ?? 0) / t) * 100 : 0;
  });

  const pAT_acum = [];
  let accAT = 0;
  for (let i = 0; i < pAT.length; i++) {
    const v = +pAT[i] || 0;
    accAT += v;
    pAT_acum.push(accAT / (i + 1));
  }

  const pFT = months.map(m => {
    const c = agg.get(m); const t = (c?.at ?? 0) + (c?.ft ?? 0) + (c?.no ?? 0);
    return t ? ((c.ft ?? 0) / t) * 100 : 0;
  });

  const pNO = months.map(m => {
    const c = agg.get(m); const t = (c?.at ?? 0) + (c?.ft ?? 0) + (c?.no ?? 0);
    return t ? ((c.no ?? 0) / t) * 100 : 0;
  });

  const el = document.getElementById("chartTendencia");
  if (!el || !window.echarts) return;

  if (!chartTendencia) chartTendencia = echarts.init(el, null, { renderer: "canvas" });

  const option = {
    grid: { left: 56, right: 18, top: 16, bottom: 62 },
    tooltip: {
      trigger: "axis",
      confine: true,
      formatter: (params) => {
        const axis = params?.[0]?.axisValue ?? "";
        let html = `<b>${axis}</b><br/>`;
        for (const p of params) {
          html += `${p.marker} ${p.seriesName}: <b>${_fmtNum1(p.data)}</b>%<br/>`;
        }
        return html;
      }
    },
    legend: {
      bottom: 12,
      left: "center",
      itemWidth: 14,
      itemHeight: 10,
      textStyle: { fontWeight: 800 }
    },
    xAxis: {
      type: "category",
      data: months,
      axisLabel: { fontWeight: 700 }
    },
    yAxis: {
      type: "value",
      min: 0,
      max: 100,
      axisLabel: { formatter: "{value}%" },
      splitLine: { lineStyle: { color: "rgba(15,23,42,0.06)" } }
    },
    series: [
      {
        name: "Respondidos AT %",
        type: "line",
        data: pAT.map(v => +(+v).toFixed(2)),
        symbolSize: 7,
        lineStyle: { width: 3, color: COLORS.green },
        itemStyle: { color: COLORS.green, borderColor: "#fff", borderWidth: 2 },
        label: {
          show: true,
          position: "top",
          formatter: (p) => {
            const v = +p.data || 0;
            return (v < 78)
              ? `{warn|⚠ ${_fmtPct(v)}}`
              : `{ok|${_fmtPct(v)}}`;
          },
          rich: {
            ok: { fontWeight: 900, color: COLORS.green },
            warn: {
              fontWeight: 950,
              color: "#7f1d1d",
              borderColor: "#ef4444",
              borderWidth: 1,
              borderRadius: 4,
              padding: [2, 4]
            }
          }
        },
        zlevel: 5, z: 5
      },
      {
        name: "%AT Acumulado",
        type: "line",
        data: pAT_acum.map(v => +(+v).toFixed(2)),
        symbolSize: 7,
        lineStyle: { width: 3, type: "solid", color: "#c084fc" },
        itemStyle: { color: "#c084fc", borderColor: "#fff", borderWidth: 2 },
        label: {
          show: true,
          position: "top",
          formatter: (p) => {
            const v = +p.data || 0;
            return (v < 78)
              ? `{warn|? ${_fmtPct(v)}}`
              : `{ok|${_fmtPct(v)}}`;
          },
          rich: {
            ok: { fontWeight: 900, color: "#9333ea" },
            warn: {
              fontWeight: 950,
              color: "#7f1d1d",
              backgroundColor: "rgba(239,68,68,0.18)",
              borderColor: "#ef4444",
              borderWidth: 1,
              borderRadius: 4,
              padding: [2, 4]
            }
          }
        },
        zlevel: 4, z: 4
      },
      {
        name: "Respondidos FT %",
        type: "line",
        data: pFT.map(v => +(+v).toFixed(2)),
        symbolSize: 7,
        lineStyle: { width: 3, color: COLORS.amber },
        itemStyle: { color: COLORS.amber, borderColor: "#fff", borderWidth: 2 },
        label: { show: true, position: "top", fontWeight: 900, formatter: (p) => _fmtPct(p.data) },
        zlevel: 5, z: 5
      },
      {
        name: "No Respondidos %",
        type: "line",
        data: pNO.map(v => +(+v).toFixed(2)),
        symbolSize: 7,
        lineStyle: { width: 3, color: COLORS.red },
        itemStyle: { color: COLORS.red, borderColor: "#fff", borderWidth: 2 },
        label: { show: true, position: "top", fontWeight: 900, formatter: (p) => _fmtPct(p.data) },
        zlevel: 5, z: 5
      }
    ]
  };

  chartTendencia.setOption(option, true);
  window.addEventListener("resize", () => chartTendencia && chartTendencia.resize(), { passive: true });
}

/* ============================
   DOWNLOAD: NO ENTREGADOS
   ============================ */
function escapeCSV(v) {
  const s = (v ?? "").toString();
  if (/[;"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCSV(filename, rows, cols) {
  // Convertimos a Excel usando SheetJS (XLSX)
  const data = [cols];
  rows.forEach(r => {
    data.push(cols.map(c => r[c]));
  });
  
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Reporte");
  
  // Cambiamos la extensión .csv por .xlsx
  const xlsxFilename = filename.replace(/\.csv$/i, ".xlsx");
  XLSX.writeFile(wb, xlsxFilename);
}

function getNoCumplidosRows(rows) {
  const ESTADO_ITEM_COL = "ESTADO ITEM";
  return rows.filter(r => {
    const estado = (r[ESTADO_ITEM_COL] || "").toString().trim().toUpperCase();
    return estado !== "CUMPLIDO" && estado !== "PROCESADO";
  });
}

/* ============================
   APPLY ALL
   ============================ */
function applyAll() {
  const cs = getSelValues("clienteSelect");
  const baseOnlyCliente = cs.length ? data.filter(r => cs.includes(clean(r[CLIENT_COL]))) : data;
  renderCentros(baseOnlyCliente);

  const baseCliente = rowsByClienteBase();

  renderClasif2(baseCliente);

  const baseParaGc = (() => {
    let r = baseCliente;
    const c2s = getCheckedClasif2();
    if (c2s.length && CLASIF2_COL) r = r.filter(x => c2s.includes(clean(x[CLASIF2_COL])));
    return r;
  })();
  renderGcoc(baseParaGc);

  const rows = filteredRowsNoMes();

  const months = buildMesSelect(rows);

  updateKPIsGeneral(rows);
  updateKPIsMonthly(rows, months);

  buildChartMes(rows);
  buildChartTendencia(rows);
}

/* ============================
   INIT
   ============================ */
window.addEventListener("DOMContentLoaded", () => {
  if (window.LAST_UPDATE) {
    setText("lastUpdate", (window.LAST_UPDATE || "").toString().trim());
  }

  async function loadData() {
    const buster = window.CACHE_BUSTER || Date.now();
    const requestUrl = `${csvUrl}?v=${buster}`;
    return await window.fetchWithCache(requestUrl);
  }

  loadData()
    .then(text => {
      if (typeof Papa !== 'undefined') {
        const results = Papa.parse(text, {
          delimiter: DELIM,
          header: true,
          skipEmptyLines: true,
          transform: (v) => clean(v)
        });
        data = results.data;
        headers = results.meta.fields;
      } else {
        const m = parseDelimited(text, DELIM);
        if (!m.length || m.length < 2) {
          showError("El CSV está vacío o no tiene filas.");
          return;
        }
        headers = m[0].map(clean);
        data = m.slice(1).map(row => {
          const o = {};
          headers.forEach((h, i) => (o[h] = clean(row[i])));
          return o;
        });
      }

      CLIENT_COL = CLIENT_CANDIDATES.find(c => headers.includes(c));
      if (!CLIENT_COL) {
        showError("No encuentro columna CLIENTE Obra/Centro de costo. Probé: " + CLIENT_CANDIDATES.join(" / "));
        return;
      }

      CENTRO_COL = CENTRO_CANDIDATES.find(c => headers.includes(c)) || null;
      CLASIF2_COL = CLASIF2_CANDIDATES.find(c => headers.includes(c)) || null;
      GCOC_COL = GCOC_CANDIDATES.find(c => headers.includes(c)) || null;

      // Detect Demora Column dynamically
      const detectedDemora = DEMORA_CANDIDATES.find(c => headers.includes(c));
      if (detectedDemora) {
        DEMORA_COL = detectedDemora;
      }

      const required = [FECHA_COL, AT_COL, FT_COL, NO_COL];
      const missing = required.filter(c => !headers.includes(c));
      if (missing.length) {
        showError("Faltan columnas en el CSV: " + missing.join(", "));
        return;
      }

      setText("clienteHint", `Columna cliente: ${CLIENT_COL}`);
      setText("centroHint", CENTRO_COL ? `Columna: ${CENTRO_COL}` : "Columna: (no encontrada)");
      setText("clasif2Hint", CLASIF2_COL ? `Columna: ${CLASIF2_COL}` : "Columna: (no encontrada)");
      setText("gcocHint", GCOC_COL ? `Columna: ${GCOC_COL}` : "Columna: (no encontrada)");

      renderClientes();
      applyAll();

      const loader = document.getElementById("loader");
      if (loader) loader.classList.add("hidden");

      document.getElementById("clienteSelect")?.addEventListener("change", (e) => {
        enforceAllOption(e.target);
        const gc = document.getElementById("gcocSelect");
        if (gc) { gc.selectedIndex = 0; enforceAllOption(gc); }
        applyAll();
      });

      document.getElementById("centroSelect")?.addEventListener("change", (e) => {
        enforceAllOption(e.target);
        applyAll();
      });

      document.getElementById("gcocSelect")?.addEventListener("change", (e) => { enforceAllOption(e.target); applyAll(); });
      document.getElementById("clasif2Select")?.addEventListener("change", (e) => {
        enforceAllOption(e.target);
        const gc = document.getElementById("gcocSelect");
        if (gc) { gc.selectedIndex = 0; enforceAllOption(gc); }
        applyAll();
      });

      document.getElementById("mesSelect")?.addEventListener("change", (e) => {
        enforceAllOption(e.target);
        updateMesTitleFromSelect();
        const rows = filteredRowsNoMes();
        const months = [...new Set(rows.map(getMonthKeyFromRow).filter(Boolean))].sort();
        updateKPIsMonthly(rows, months);
      });

      document.getElementById("btnDownloadNoCumplidos")?.addEventListener("click", () => {
        const rowsFilt = filteredRowsByAll();
        const noCumplidosRows = getNoCumplidosRows(rowsFilt);

        if (!noCumplidosRows.length) {
          alert("No hay registros NO CUMPLIDOS para el filtro actual.");
          return;
        }

        const cols = headers.slice();

        const cliente = safeFilePart(selLabel("clienteSelect"));
        const c2 = safeFilePart(selLabel("clasif2Select"));
        const gc = safeFilePart(selLabel("gcocSelect"));
        const mes = safeFilePart(selLabel("mesSelect"));

        const filename = `NO_CUMPLIDOS_${cliente}_${c2}_${gc}_${mes}.csv`;
        downloadCSV(filename, noCumplidosRows, cols);
      });

      setHTML("msg", "");
    })
    .catch(err => {
      console.error(err);
      showError("Error cargando CSV: " + (err?.message || err));
    })
    .finally(() => {
      const loader = document.getElementById("loader");
      if (loader && !loader.classList.contains("hidden")) loader.classList.add("hidden");
    });
});
