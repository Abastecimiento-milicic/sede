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

function getCaracterGC(clasificacion) {
  const c = clean(clasificacion).toUpperCase();
  if (c.includes("SEDE")) return "SEDE";
  if (c.includes("EQUIPOS")) return "EQUIPOS";
  if (c.includes("LOCAL")) return "LOCAL";
  if (c.includes("PAÑOL") || c.includes("PANOL")) return "ALMACÉN";
  return c ? c : "SIN CLASIFICACIÓN";
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
   CONFIG
   ============================ */
const csvUrl = "./CUMPLIMIENTO_SEDE.csv";
const DELIM = ";";

const CLIENT_COL = "CLIENTE";
const CLASIFICACION_COL = "CLASIFICACION";
const GRUPO_COMPRA_COL = "GRUPO DE COMPRA OC";
const COMPRADOR_COL = "OPERADOR OC";
const MES_COL = "MES ENTREGA";
const FT_COL = "ENTREGADOS FT";

/* ============================
   GLOBAL
   ============================ */
let data = [];
let headers = [];

/* ============================
   FILTERING & METRICS
   ============================ */
const MONTH_NAMES = {
  "01": "ENERO", "02": "FEBRERO", "03": "MARZO", "04": "ABRIL",
  "05": "MAYO", "06": "JUNIO", "07": "JULIO", "08": "AGOSTO",
  "09": "SEPTIEMBRE", "10": "OCTUBRE", "11": "NOVIEMBRE", "12": "DICIEMBRE"
};

function buildMesSelect(months) {
  const sel = document.getElementById("mesSelect");
  if (!sel) return;

  const prevSet = new Set([...sel.selectedOptions].map(o => o.value));
  sel.innerHTML = "";

  const optAll = document.createElement("option");
  optAll.value = "__ALL__";
  optAll.textContent = "Todos";
  sel.appendChild(optAll);

  for (const m of months) {
    const o = document.createElement("option");
    o.value = m;

    let displayText = m;
    const parts = m.split("-");
    if (parts.length === 2) {
      const [year, monthNum] = parts;
      const name = MONTH_NAMES[monthNum];
      if (name) displayText = `${name} ${year}`;
    }

    o.textContent = displayText;
    if (prevSet.has(m)) o.selected = true;
    sel.appendChild(o);
  }

  enforceAllOption(sel);
}

function getFilteredRows() {
  const cs = getSelValues("clienteSelect");
  const gcs = getSelValues("caracterSelect");
  const gcs_compra = getSelValues("grupoCompraSelect");
  const comps = getSelValues("compradorSelect");
  const ms = getSelValues("mesSelect");

  return data.filter(r => {
    const matchClient = !cs.length || cs.includes(clean(r[CLIENT_COL]));
    
    // Caracter GC derived check
    const carGC = getCaracterGC(r[CLASIFICACION_COL]);
    const matchGc = !gcs.length || gcs.includes(carGC);
    
    const matchGcCompra = !gcs_compra.length || gcs_compra.includes(clean(r[GRUPO_COMPRA_COL]));
    const matchComprador = !comps.length || comps.includes(clean(r[COMPRADOR_COL]));
    
    const mk = getMonthKeyFromRow(r);
    const matchMes = !ms.length || ms.includes(mk);

    return matchClient && matchGc && matchGcCompra && matchComprador && matchMes;
  });
}

function updateDashboard() {
  const rows = getFilteredRows();

  // Filter rows representing delayed (FT) items
  const delayedRows = rows.filter(r => clean(r[FT_COL]) === "1");
  const totalDemorasCount = delayedRows.length;

  // Calculate top CARACTER DE GC
  const gcCounts = {};
  for (const r of delayedRows) {
    const gc = getCaracterGC(r[CLASIFICACION_COL]);
    gcCounts[gc] = (gcCounts[gc] || 0) + 1;
  }

  let topGcName = "-";
  let topGcPct = "0%";
  
  if (totalDemorasCount > 0) {
    let maxCount = -1;
    for (const [name, count] of Object.entries(gcCounts)) {
      if (count > maxCount) {
        maxCount = count;
        topGcName = name;
      }
    }
    const pctVal = (maxCount / totalDemorasCount) * 100;
    topGcPct = pctVal.toFixed(1).replace(".", ",") + "%";
  }

  // Populate cards
  document.getElementById("kpiTotalDemoras").textContent = fmtInt(totalDemorasCount);
  document.getElementById("kpiTopGc").textContent = topGcName;
  document.getElementById("kpiTopGcPct").textContent = topGcPct;

  // Render charts
  renderPieChart(delayedRows);
  renderTrendChart();
}

/* ============================
   CHARTS & TREND HELPERS
   ============================ */
let chartPie = null;
let chartTendencia = null;

function getTrendRows() {
  const cs = getSelValues("clienteSelect");
  const gcs_compra = getSelValues("grupoCompraSelect");
  const comps = getSelValues("compradorSelect");

  return data.filter(r => {
    const matchClient = !cs.length || cs.includes(clean(r[CLIENT_COL]));
    const matchGcCompra = !gcs_compra.length || gcs_compra.includes(clean(r[GRUPO_COMPRA_COL]));
    const matchComprador = !comps.length || comps.includes(clean(r[COMPRADOR_COL]));
    return matchClient && matchGcCompra && matchComprador;
  });
}

function getMonthKeyFromRow(r) {
  const d = parseDateAny(r["FECHA ENTREGA ESPERADA"]);
  return d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` : null;
}

function parseDateAny(s) {
  const t = clean(s);
  if (!t) return null;
  let m = t.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  m = t.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  return null;
}

function renderPieChart(delayedRows) {
  const el = document.getElementById("chartPie");
  if (!el || !window.echarts) return;

  if (!chartPie) chartPie = echarts.init(el, null, { renderer: "canvas" });

  const gcCounts = {};
  for (const r of delayedRows) {
    const gc = getCaracterGC(r[CLASIFICACION_COL]);
    gcCounts[gc] = (gcCounts[gc] || 0) + 1;
  }

  const items = Object.entries(gcCounts).map(([name, count]) => {
    return { name, value: count };
  });

  if (!items.length) {
    chartPie.clear();
    return;
  }

  const total = items.reduce((a, b) => a + b.value, 0) || 1;
  const maxVal = Math.max(...items.map(d => d.value));

  const colorByName = new Map([
    ["SEDE", "#1e3a8a"],          // Deep Blue/Navy
    ["EQUIPOS", "#2563eb"],       // Royal Blue
    ["LOCAL", "#3b82f6"],         // Light Blue
    ["ALMACÉN", "#f97316"],       // Vibrant Orange
    ["SIN CLASIFICACIÓN", "#f59e0b"] // Amber/Orange
  ]);

  const dataWithColors = items.map((it) => {
    const isMax = it.value === maxVal;
    const baseColor = colorByName.get(it.name) || "#6c757d";
    return {
      name: it.name,
      value: it.value,
      itemStyle: {
        color: isMax ? "#dc3545" : baseColor,
        borderColor: "#fff",
        borderWidth: isMax ? 4 : 2,
        shadowBlur: isMax ? 14 : 0,
        shadowColor: isMax ? "rgba(0,0,0,0.30)" : "rgba(0,0,0,0)"
      }
    };
  }).sort((a, b) => b.value - a.value);

  const option = {
    tooltip: {
      trigger: "item",
      formatter: (p) => {
        const pct = (p.value / total) * 100;
        return `${p.name}: <b>${fmtInt(p.value)}</b> (${pct.toFixed(1).replace(".", ",")}%)`;
      }
    },
    legend: {
      orient: "vertical",
      right: 10,
      top: "middle",
      itemWidth: 18,
      itemHeight: 10,
      textStyle: { fontWeight: 'bold', fontSize: 11, color: '#334155' },
      formatter: (name) => {
        const it = items.find(x => x.name === name);
        const v = it ? it.value : 0;
        const pct = (v / total) * 100;
        return `${name} - ${pct.toFixed(1).replace(".", ",")}%`;
      }
    },
    series: [
      {
        name: "Distribución de Demoras",
        type: "pie",
        radius: ["40%", "72%"],
        center: ["40%", "50%"],
        avoidLabelOverlap: true,
        label: {
          show: true,
          position: "outside",
          fontSize: 10,
          fontWeight: "bold",
          color: '#1e293b',
          formatter: (p) => `${p.name}\n${p.value} (${p.percent.toFixed(1).replace(".", ",")}%)`
        },
        labelLine: {
          show: true,
          length: 12,
          length2: 8,
          smooth: true
        },
        data: dataWithColors
      }
    ]
  };

  chartPie.setOption(option, true);
}

function renderTrendChart() {
  const el = document.getElementById("chartTendencia");
  if (!el || !window.echarts) return;

  if (!chartTendencia) chartTendencia = echarts.init(el, null, { renderer: "canvas" });

  // Only FT rows matching CLIENTE, GRUPO DE COMPRA, and COMPRADOR filters
  const trendRows = getTrendRows().filter(r => clean(r[FT_COL]) === "1");

  const categories = ["ALMACÉN", "EQUIPOS", "LOCAL", "SEDE", "SIN CLASIFICACIÓN"];
  const colorByName = new Map([
    ["SEDE", "#1e3a8a"],          // Deep Blue/Navy
    ["EQUIPOS", "#2563eb"],       // Royal Blue
    ["LOCAL", "#3b82f6"],         // Light Blue
    ["ALMACÉN", "#f97316"],       // Vibrant Orange
    ["SIN CLASIFICACIÓN", "#f59e0b"] // Amber/Orange
  ]);

  // Aggregate by month and Caracter de GC
  const monthlyAgg = new Map(); 

  for (const r of trendRows) {
    const mk = getMonthKeyFromRow(r);
    if (!mk) continue;

    if (!monthlyAgg.has(mk)) {
      const obj = {};
      categories.forEach(c => obj[c] = 0);
      monthlyAgg.set(mk, obj);
    }
    const agg = monthlyAgg.get(mk);
    const gc = getCaracterGC(r[CLASIFICACION_COL]);
    agg[gc] = (agg[gc] || 0) + 1;
  }

  const monthsSorted = [...monthlyAgg.keys()].sort();

  if (!monthsSorted.length) {
    chartTendencia.clear();
    return;
  }

  // Pre-calculate monthly totals and maxes for highlighting
  const monthlyTotals = new Map();
  const maxByMonth = new Map();

  monthsSorted.forEach(m => {
    const agg = monthlyAgg.get(m);
    let sum = 0;
    let maxVal = -1;
    let maxCat = "";

    categories.forEach(cat => {
      const val = agg[cat] || 0;
      sum += val;
      if (val > maxVal) {
        maxVal = val;
        maxCat = cat;
      }
    });

    monthlyTotals.set(m, sum);
    maxByMonth.set(m, { val: maxVal, cat: maxCat });
  });

  const seriesBars = categories.map((catName) => {
    const baseColor = colorByName.get(catName) || "#6c757d";
    return {
      name: catName,
      type: "bar",
      barGap: '10%',
      barCategoryGap: '30%',
      data: monthsSorted.map(m => {
        const agg = monthlyAgg.get(m);
        const val = agg[catName] || 0;

        const monMax = maxByMonth.get(m);
        const isMax = (monMax && monMax.cat === catName && val > 0);

        return {
          value: val,
          month: m,
          isMax: isMax,
          cat: catName,
          itemStyle: {
            color: isMax ? "#dc3545" : baseColor
          }
        };
      }),
      label: {
        show: true,
        rotate: 90,
        align: 'left',
        verticalAlign: 'middle',
        position: 'insideBottom',
        distance: 12,
        formatter: (params) => {
          const v = params.value;
          if (!v) return "";
          const d = params.data;
          const total = monthlyTotals.get(d.month) || 0;
          const pct = total ? ((v / total) * 100).toFixed(1).replace('.', ',') + '%' : '0%';

          if (d.isMax) {
            return `{max|${v} - ${pct} - ${params.seriesName}}`;
          }
          return ` {norm|${v} - ${pct} - ${params.seriesName}} `;
        },
        rich: {
          max: {
            color: '#fff',
            backgroundColor: '#dc3545',
            padding: [4, 6],
            borderRadius: 4,
            fontWeight: 800,
            fontSize: 11,
            shadowBlur: 2,
            shadowColor: 'rgba(0,0,0,0.3)'
          },
          norm: {
            color: '#000',
            backgroundColor: 'rgba(255,255,255, 0.85)',
            padding: [3, 4],
            borderRadius: 3,
            fontWeight: 700,
            fontSize: 10,
            borderColor: 'rgba(0,0,0,0.1)',
            borderWidth: 1
          }
        }
      }
    };
  });

  const option = {
    tooltip: {
      trigger: "item",
      formatter: (p) => {
        const m = p.data.month;
        const total = monthlyTotals.get(m) || 0;
        const pct = total ? ((p.value / total) * 100).toFixed(1).replace('.', ',') + '%' : '-';
        return `<b>${p.seriesName}</b><br/>Mes: ${m}<br/>Cantidad: <b>${p.value}</b> (${pct})`;
      }
    },
    legend: { bottom: 0, type: "scroll", textStyle: { fontWeight: 600 } },
    grid: {
      left: 50, right: 30, top: 30, bottom: 85,
      containLabel: true
    },
    dataZoom: [
      {
        type: 'slider',
        show: true,
        xAxisIndex: 0,
        startValue: 0,
        endValue: 4,
        bottom: 40,
        height: 22,
        zoomLock: true,
        brushSelect: false
      },
      {
        type: 'inside',
        xAxisIndex: 0,
        zoomOnMouseWheel: false,
        moveOnMouseWheel: true
      }
    ],
    xAxis: {
      type: "category",
      data: monthsSorted,
      axisLabel: { fontWeight: 700, interval: 0 },
      axisTick: { alignWithLabel: true }
    },
    yAxis: { type: "value", splitLine: { lineStyle: { type: 'dashed' } } },
    series: seriesBars
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
    const CACHE_NAME = "demoras-sede-data-v2";
    const requestUrl = csvUrl + "?v=" + version;
    const cache = await caches.open(CACHE_NAME);
    
    const cachedResponse = await cache.match(requestUrl);
    if (cachedResponse) {
      console.log("Cargando datos desde cache...");
      return cachedResponse.text();
    }

    console.log("Descargando datos...");
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

      const caracteres = uniqSorted(data.map(r => getCaracterGC(r[CLASIFICACION_COL])));
      fillSelect("caracterSelect", caracteres, "Todos");

      const gruposCompra = uniqSorted(data.map(r => r[GRUPO_COMPRA_COL]));
      fillSelect("grupoCompraSelect", gruposCompra, "Todos");

      const compradores = uniqSorted(data.map(r => r[COMPRADOR_COL]));
      fillSelect("compradorSelect", compradores, "Todos");

      const meses = [...new Set(data.map(getMonthKeyFromRow).filter(Boolean))].sort();
      buildMesSelect(meses);

      updateDashboard();

      const loader = document.getElementById("loader");
      if (loader) loader.classList.add("hidden");

      // Event listeners
      ["clienteSelect", "caracterSelect", "grupoCompraSelect", "compradorSelect", "mesSelect"].forEach(id => {
        document.getElementById(id)?.addEventListener("change", (e) => {
          enforceAllOption(e.target);
          updateDashboard();
        });
      });

      // Handle resize
      window.addEventListener("resize", () => {
        if (chartPie) chartPie.resize();
        if (chartTendencia) chartTendencia.resize();
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
