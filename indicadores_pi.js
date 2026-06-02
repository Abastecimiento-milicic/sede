function _fmtPct(v) { if (v == null || isNaN(v)) return ""; const n = Math.round(v * 10) / 10; return n.toString().replace(".", ",") + "%"; }
function _fmtNum1(v) { if (v == null || isNaN(v)) return ""; const n = Math.round(v * 10) / 10; return n.toString().replace(".", ","); }

function median(arr) {
  if (!arr.length) return 0;
  const s = arr.slice().sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 !== 0 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function average(arr) {
  if (!arr.length) return 0;
  const sum = arr.reduce((a, b) => a + b, 0);
  return sum / arr.length;
}

function clean(v) {
  let s = (v ?? "").toString().trim();
  s = s.replace(/&#160;/g, " ");
  s = s.replace(/&nbsp;/g, " ");
  return s.trim();
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

function uniqSorted(arr) {
  return [...new Set(arr.map(clean).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
}

function showError(msg) {
  const el = document.getElementById("msg");
  if (el) el.innerHTML = `<div style="background-color: #fee2e2; border: 1px solid #f87171; color: #991b1b; padding: 1rem; border-radius: 6px; margin-bottom: 1rem; font-weight: 600;">${msg}</div>`;
}

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
   CONFIG
   ============================ */
const csvUrl = "./R1 - REPORTE CUMPLIMIENTO PI ACUMULADO.csv";
const DELIM = ";";

const FECHA_COL = "FECHA ENTREGA ESPERADA";
const CLIENT_COL = "CLIENTE";
const MES_COL = "MES ENTREGA";

const LIBERACION_DAYS_COL = "dDIAS LIBERACION SOLPED";
const PROCESAMIENTO_DAYS_COL = "dDIAS PROCESAMIENTO ";
const RESPUESTA_DAYS_COL = "dDIAS RESPUESTA";

const LIBERACION_IND_COL = "iLIBERACION SOLPED";
const PROCESAMIENTO_IND_COL = "iPROCESAMIENTO";
const RESPUESTA_IND_COL = "iRESPUESTA";

/* ============================
   GLOBAL
   ============================ */
let data = [];
let headers = [];

let chartPie = null;
let chartTendencia = null;

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

function getYearFromRow(r) {
  const d = parseDateAny(r[FECHA_COL]);
  return d ? d.getFullYear().toString() : "";
}

function getMonthKeyFromRow(r) {
  const d = parseDateAny(r[FECHA_COL]);
  return d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` : null;
}

/* ============================
   SELECT UTIL
   ============================ */
function fillSelect(selectId, values, placeholder = "Todos", prevSelected = []) {
  const sel = document.getElementById(selectId);
  if (!sel) return;

  const prevSet = new Set(prevSelected.length ? prevSelected : [...sel.selectedOptions].map(o => o.value));

  sel.innerHTML = "";

  const optAll = document.createElement("option");
  optAll.value = "__ALL__";
  optAll.textContent = placeholder;
  sel.appendChild(optAll);

  for (const v of values) {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = v;
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

/* ============================
   FILTERING
   ============================ */
function getFilteredRows() {
  const cs = getSelValues("clienteSelect");
  const ms = getSelValues("mesSelect");
  const ys = getSelValues("anioSelect");

  return data.filter(r => {
    const matchClient = !cs.length || cs.includes(clean(r[CLIENT_COL]));
    
    // MES ENTREGA check
    const mVal = clean(r[MES_COL]).toLowerCase();
    const matchMes = !ms.length || ms.some(m => mVal.includes(m.toLowerCase()));
    
    // ANIO check
    const yVal = getYearFromRow(r);
    const matchAnio = !ys.length || ys.includes(yVal);

    return matchClient && matchMes && matchAnio;
  });
}

function getTrendRows() {
  const cs = getSelValues("clienteSelect");
  return data.filter(r => {
    const matchClient = !cs.length || cs.includes(clean(r[CLIENT_COL]));
    return matchClient;
  });
}

/* ============================
   CALCULATIONS & CHART POPULATION
   ============================ */
function calculateMetrics(rows) {
  let countLib = 0;
  let countProc = 0;
  let countResp = 0;

  const libDelays = [];
  const procDelays = [];
  const respDelays = [];

  for (const r of rows) {
    const libVal = toNumber(r[LIBERACION_IND_COL]) || toNumber(r[LIBERACION_DAYS_COL]);
    const procVal = toNumber(r[PROCESAMIENTO_IND_COL]) || toNumber(r[PROCESAMIENTO_DAYS_COL]);
    const respVal = toNumber(r[RESPUESTA_IND_COL]) || toNumber(r[RESPUESTA_DAYS_COL]);

    // Delay thresholds:
    // LIBERACIÓN SOLPED > 1 day
    if (libVal > 1) {
      countLib++;
      libDelays.push(libVal);
    }
    // PROCESAMIENTO > 2 days
    if (procVal > 2) {
      countProc++;
      procDelays.push(procVal);
    }
    // RESPUESTA > 0 days
    if (respVal > 0) {
      countResp++;
      respDelays.push(respVal);
    }
  }

  return {
    liberacion: { count: countLib, average: Math.round(average(libDelays)) },
    procesamiento: { count: countProc, average: Math.round(average(procDelays)) },
    respuesta: { count: countResp, average: Math.round(average(respDelays)) }
  };
}

function updateTableAndCharts() {
  const rows = getFilteredRows();
  const metrics = calculateMetrics(rows);

  // Update UI table
  document.getElementById("liberacionCount").textContent = fmtInt(metrics.liberacion.count);
  document.getElementById("liberacionMedian").textContent = metrics.liberacion.average + " días";

  document.getElementById("procesamientoCount").textContent = fmtInt(metrics.procesamiento.count);
  document.getElementById("procesamientoMedian").textContent = metrics.procesamiento.average + " días";

  document.getElementById("respuestaCount").textContent = fmtInt(metrics.respuesta.count);
  document.getElementById("respuestaMedian").textContent = metrics.respuesta.average + " días";

  // Total demoras
  const totalDemoras = metrics.liberacion.count + metrics.procesamiento.count + metrics.respuesta.count;
  document.getElementById("totalDemorasCount").textContent = fmtInt(totalDemoras);

  // Render Pie Chart
  renderPieChart(metrics);
  
  // Render Trend Chart (ONLY affected by client/obra filter, NOT month/year!)
  const trendRows = getTrendRows();
  renderTrendChart(trendRows);
}

function renderPieChart(metrics) {
  const el = document.getElementById("chartPie");
  if (!el || !window.echarts) return;

  if (!chartPie) chartPie = echarts.init(el, null, { renderer: "canvas" });

  const dataValues = [
    { value: metrics.liberacion.count, name: "LIBERACION SOLPED", itemStyle: { color: "#0C6478" } },
    { value: metrics.procesamiento.count, name: "PROCESAMIENTO", itemStyle: { color: "#15919B" } },
    { value: metrics.respuesta.count, name: "RESPUESTA", itemStyle: { color: "#46DFB1" } }
  ].filter(item => item.value > 0);

  const total = dataValues.reduce((sum, item) => sum + item.value, 0);

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '<b>{b}</b><br/>Casos con demoras: <b>{c}</b> ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: '5%',
      top: 'center',
      textStyle: { fontWeight: 'bold', fontSize: 11, color: '#334155' },
      formatter: (name) => {
        const item = dataValues.find(d => d.name === name);
        if (!item) return name;
        const pct = total ? ((item.value / total) * 100).toFixed(1).replace(".", ",") + "%" : "0%";
        return `${name} - ${pct}`;
      }
    },
    series: [
      {
        name: 'Distribución de Demoras',
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['35%', '50%'],
        minAngle: 15,
        avoidLabelOverlap: true,
        label: {
          show: true,
          position: 'outside',
          formatter: '{b}\n{c} ({d}%)',
          fontWeight: 'bold',
          color: '#1e293b',
          fontSize: 10
        },
        labelLine: {
          show: true,
          length: 12,
          length2: 8,
          smooth: true
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.3)'
          }
        },
        data: dataValues
      }
    ]
  };

  chartPie.setOption(option, true);
}

function renderTrendChart(rows) {
  const el = document.getElementById("chartTendencia");
  if (!el || !window.echarts) return;

  if (!chartTendencia) chartTendencia = echarts.init(el, null, { renderer: "canvas" });

  const monthlyAgg = new Map();
  
  for (const r of rows) {
    const mk = getMonthKeyFromRow(r);
    if (!mk) continue;

    if (!monthlyAgg.has(mk)) {
      monthlyAgg.set(mk, { lib: 0, proc: 0, resp: 0 });
    }
    const agg = monthlyAgg.get(mk);

    const libVal = toNumber(r[LIBERACION_IND_COL]) || toNumber(r[LIBERACION_DAYS_COL]);
    const procVal = toNumber(r[PROCESAMIENTO_IND_COL]) || toNumber(r[PROCESAMIENTO_DAYS_COL]);
    const respVal = toNumber(r[RESPUESTA_IND_COL]) || toNumber(r[RESPUESTA_DAYS_COL]);

    if (libVal > 1) agg.lib++;
    if (procVal > 2) agg.proc++;
    if (respVal > 0) agg.resp++;
  }

  const monthsSorted = [...monthlyAgg.keys()].sort();
  const libData = [];
  const procData = [];
  const respData = [];

  for (const m of monthsSorted) {
    const agg = monthlyAgg.get(m);
    const tot = agg.lib + agg.proc + agg.resp;
    if (tot > 0) {
      libData.push(Math.round((agg.lib / tot) * 1000) / 10);
      procData.push(Math.round((agg.proc / tot) * 1000) / 10);
      respData.push(Math.round((agg.resp / tot) * 1000) / 10);
    } else {
      libData.push(0);
      procData.push(0);
      respData.push(0);
    }
  }

  const option = {
    grid: { left: '4%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
    tooltip: { 
      trigger: 'axis', 
      formatter: (params) => {
        let html = `<b>${params[0].axisValue}</b><br/>`;
        params.forEach(p => {
          const mKey = p.axisValue;
          const rawAgg = monthlyAgg.get(mKey);
          let rawCount = 0;
          if (p.seriesName.includes("LIBERACION")) rawCount = rawAgg.lib;
          else if (p.seriesName.includes("PROCESAMIENTO")) rawCount = rawAgg.proc;
          else if (p.seriesName.includes("RESPUESTA")) rawCount = rawAgg.resp;
          
          html += `<span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:${p.color};"></span>`
                + `${p.seriesName}: <b>${p.value.toString().replace(".", ",")}%</b> (${rawCount} casos)<br/>`;
        });
        return html;
      }
    },
    legend: { bottom: '0%', left: 'center', textStyle: { fontWeight: 'bold' } },
    xAxis: {
      type: 'category',
      data: monthsSorted,
      axisLabel: { fontWeight: 'bold' }
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLabel: { fontWeight: 'bold', formatter: '{value}%' },
      splitLine: { lineStyle: { color: 'rgba(15,23,42,0.06)' } }
    },
    series: [
      {
        name: 'LIBERACION SOLPED',
        type: 'line',
        smooth: false,
        symbol: 'circle',
        symbolSize: 8,
        data: libData,
        itemStyle: { color: "#0C6478" },
        lineStyle: { width: 3 },
        label: {
          show: true,
          position: 'top',
          formatter: (p) => p.value > 0 ? `${p.value.toString().replace(".", ",")}%` : '',
          fontWeight: 'bold',
          fontSize: 10,
          color: '#0C6478'
        }
      },
      {
        name: 'PROCESAMIENTO',
        type: 'line',
        smooth: false,
        symbol: 'circle',
        symbolSize: 8,
        data: procData,
        itemStyle: { color: "#15919B" },
        lineStyle: { width: 3 },
        label: {
          show: true,
          position: 'bottom',
          formatter: (p) => p.value > 0 ? `${p.value.toString().replace(".", ",")}%` : '',
          fontWeight: 'bold',
          fontSize: 10,
          color: '#15919B'
        }
      },
      {
        name: 'RESPUESTA',
        type: 'line',
        smooth: false,
        symbol: 'circle',
        symbolSize: 8,
        data: respData,
        itemStyle: { color: "#46DFB1" },
        lineStyle: { width: 3 },
        label: {
          show: true,
          position: 'top',
          formatter: (p) => p.value > 0 ? `${p.value.toString().replace(".", ",")}%` : '',
          fontWeight: 'bold',
          fontSize: 10,
          color: '#46DFB1'
        }
      }
    ]
  };

  chartTendencia.setOption(option, true);
}

/* ============================
   INIT
   ============================ */
window.addEventListener("DOMContentLoaded", () => {
  if (window.LAST_UPDATE) {
    const el = document.getElementById("lastUpdate");
    if (el) el.textContent = (window.LAST_UPDATE || "").toString().trim();
  }

  const scriptTag = document.currentScript;
  const version = (scriptTag && scriptTag.src.includes("?v=")) ? scriptTag.src.split("?v=")[1].split("&")[0] : new Date().getTime();

  async function loadData() {
    const CACHE_NAME = "abastecimiento-pi-data-v1";
    const requestUrl = csvUrl + "?v=" + version;
    const cache = await caches.open(CACHE_NAME);
    
    const cachedResponse = await cache.match(requestUrl);
    if (cachedResponse) {
      console.log("Cargando datos desde cache del navegador...");
      return cachedResponse.text();
    }

    console.log("Descargando datos desde el servidor...");
    const response = await fetch(requestUrl);
    if (!response.ok) throw new Error(`No pude abrir ${csvUrl} (HTTP ${response.status})`);
    
    const copy = response.clone();
    await cache.put(requestUrl, copy);
    return response.text();
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
        headers = m[0].map(clean);
        data = m.slice(1).map(row => {
          const o = {};
          headers.forEach((h, i) => (o[h] = clean(row[i])));
          return o;
        });
      }

      // Populate filters dynamically
      const clientes = uniqSorted(data.map(r => r[CLIENT_COL]));
      fillSelect("clienteSelect", clientes, "Todos");

      // Extract raw months
      const mesesRaw = uniqSorted(data.map(r => r[MES_COL]));
      fillSelect("mesSelect", mesesRaw, "Todos");

      // Extract raw years
      const aniosRaw = uniqSorted(data.map(getYearFromRow));
      fillSelect("anioSelect", aniosRaw, "Todos");

      updateTableAndCharts();

      const loader = document.getElementById("loader");
      if (loader) loader.classList.add("hidden");

      // Event listeners
      document.getElementById("clienteSelect")?.addEventListener("change", (e) => {
        enforceAllOption(e.target);
        updateTableAndCharts();
      });

      document.getElementById("mesSelect")?.addEventListener("change", (e) => {
        enforceAllOption(e.target);
        updateTableAndCharts();
      });

      document.getElementById("anioSelect")?.addEventListener("change", (e) => {
        enforceAllOption(e.target);
        updateTableAndCharts();
      });
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
