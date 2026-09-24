(function() {
  const csvUrl = "./data/REPORTE CUMPLIMIENTO SS Y SUB - SEDE.csv";
  const DELIM = ";";

  let CLIENT_COL_NAME = "CLIENTE";
  let CENTRO_COL_NAME = "CENTRO";
  let PERIODO_COL_NAME = "Período de certificación";
  let ESTADO_COL_NAME = "Estado Servicio";
  let G_COMPRA_COL_NAME = "Grupo de Compra Definitivo";
  let ESTADO_ITEM_COL = "ESTADO ITEM";

  let data = [];
  let headers = [];
  let currentSort = { col: 'count', dir: 'desc' };

  const clean = (v) => (v ?? "").toString().trim();

  function getEl(id) {
      if (!id) return null;
      return document.getElementById(id) || 
             document.getElementById("serv_" + id) || 
             document.getElementById(id.replace(/^serv_/, ""));
  }

  function setText(id, txt) { 
      const el = getEl(id); 
      if (el) el.textContent = txt ?? ""; 
  }

  function fmtInt(n) { 
      return Number(n || 0).toLocaleString("es-AR"); 
  }

  function safeFileName(str) {
      return (str || "").toString().replace(/[^\w\-]+/g, "_").replace(/^_+|_+$/g, "") || "Item";
  }

  async function fetchWithCache(url) {
      if (typeof window.fetchWithCache === "function") {
          return await window.fetchWithCache(url);
      }
      const resp = await fetch(url);
      return await resp.text();
  }

  function parseCSV(text) {
      if (typeof Papa !== 'undefined') {
          const result = Papa.parse(text, { delimiter: DELIM, skipEmptyLines: true });
          return result.data;
      }
      const rows = [];
      let row = [];
      let cur = "";
      let inQuotes = false;
      for (let i = 0; i < text.length; i++) {
          const ch = text[i];
          if (ch === '"') inQuotes = !inQuotes;
          else if (ch === DELIM && !inQuotes) { row.push(cur); cur = ""; }
          else if (ch === "\n" && !inQuotes) { row.push(cur); rows.push(row); row = []; cur = ""; }
          else cur += ch;
      }
      if (cur || row.length) { row.push(cur); rows.push(row); }
      return rows;
  }

  function getSelValues(id) {
      const sel = getEl(id);
      if (!sel) return [];
      return [...sel.selectedOptions].map(o => o.value).filter(v => v !== "__ALL__");
  }

  function downloadExcel(rows, filename = "Seleccion_Servicios.xlsx") {
      if (!rows || !rows.length) {
          alert("No hay datos seleccionados para descargar.");
          return;
      }
      if (typeof XLSX === "undefined") {
          alert("La librería de Excel (XLSX) no está cargada.");
          return;
      }
      const exportData = [headers];
      rows.forEach(r => {
          exportData.push(headers.map(h => r[h] ?? ""));
      });
      const ws = XLSX.utils.aoa_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Servicios");
      XLSX.writeFile(wb, filename);
  }

  function getItemBadgeClass(estadoItem) {
      const val = clean(estadoItem).toUpperCase();
      const rojos = ["ADJUDICADO", "ADJUDICADO PARCIAL", "RESPONDIDO", "INCOMPLETO", "SIN TRATAMIENTO"];
      const verdes = ["CUMPLIDO", "ALMACENADO", "CONSUMIDO", "CONSUMIDO PARCIAL", "RECEPCIONADO", "RECEPCIONADO PARCIAL"];
      if (verdes.some(v => val === v || val.startsWith(v))) return "badge-item-verde";
      if (rojos.some(r => val === r || val.startsWith(r))) return "badge-item-rojo";
      return "badge-item-azul";
  }

  function getServicioBadgeClass(estadoServicio) {
      const val = clean(estadoServicio);
      if (val === "En curso") return "badge-serv-verde";
      if (val.startsWith("En curso - Total recepcionado")) return "badge-serv-naranja";
      if (val.startsWith("En curso - Pr") || val.includes("ximo a vencer")) return "badge-serv-amarillo";
      if (val.includes("Vencido")) return "badge-serv-rojo";
      if (val.includes("Pedido de Info")) return "badge-serv-morado";
      return "badge-serv-gris";
  }

  function renderResumenTable(filtered) {
      const resumenTbody = getEl("serv_resumenBody") || getEl("resumenBody");
      if (!resumenTbody) return;
      resumenTbody.innerHTML = "";

      if (!filtered || filtered.length === 0) {
          resumenTbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #64748b; padding: 25px; font-style: italic;">No hay pedidos para los filtros seleccionados</td></tr>`;
          return;
      }

      // Agrupar por ESTADO ITEM y Estado Servicio guardando las filas asociadas
      const summaryMap = new Map();
      filtered.forEach(r => {
          const estadoItem = clean(r[ESTADO_ITEM_COL]) || "(Sin Estado Item)";
          const estadoServicio = clean(r[ESTADO_COL_NAME]) || "(Sin Estado Servicio)";
          const key = `${estadoItem}___${estadoServicio}`;

          if (!summaryMap.has(key)) {
              summaryMap.set(key, { estadoItem, estadoServicio, count: 0, rows: [] });
          }
          const grp = summaryMap.get(key);
          grp.count += 1;
          grp.rows.push(r);
      });

      const summaryList = Array.from(summaryMap.values());

      // Ordenamiento dinámico
      summaryList.sort((a, b) => {
          let res = 0;
          if (currentSort.col === 'count') {
              res = a.count - b.count;
              if (res === 0) res = a.estadoItem.localeCompare(b.estadoItem);
          } else if (currentSort.col === 'estadoItem') {
              res = a.estadoItem.localeCompare(b.estadoItem);
              if (res === 0) res = b.count - a.count;
          } else if (currentSort.col === 'estadoServicio') {
              res = a.estadoServicio.localeCompare(b.estadoServicio);
              if (res === 0) res = b.count - a.count;
          }
          return currentSort.dir === 'desc' ? -res : res;
      });

      // Actualizar íconos indicadores de orden en encabezados
      ['estadoItem', 'estadoServicio', 'count'].forEach(col => {
          const icon = getEl(`serv_sort_${col}`) || getEl(`sort_${col}`);
          if (icon) {
              if (currentSort.col === col) {
                  icon.textContent = currentSort.dir === 'asc' ? '▲' : '▼';
                  icon.style.color = '#2563eb';
              } else {
                  icon.textContent = '↕';
                  icon.style.color = '#94a3b8';
              }
          }
      });

      // Renderizar filas de la tabla con botón de descarga individual
      summaryList.forEach((item, index) => {
          const tr = document.createElement("tr");
          const itemBadge = getItemBadgeClass(item.estadoItem);
          const servBadge = getServicioBadgeClass(item.estadoServicio);

          tr.innerHTML = `
              <td><span class="badge-item-status ${itemBadge}">${item.estadoItem}</span></td>
              <td><span class="badge-serv-status ${servBadge}">${item.estadoServicio}</span></td>
              <td style="text-align: right;"><span style="font-weight: 700; font-size: 0.95rem; color: #1e293b;">${fmtInt(item.count)}</span></td>
              <td style="text-align: center;">
                  <button class="btn-table-download" data-idx="${index}" title="Descargar ${item.count} items en Excel">⬇ Descargar</button>
              </td>
          `;
          resumenTbody.appendChild(tr);
      });

      // Listener para cada botón de descarga por fila
      resumenTbody.querySelectorAll(".btn-table-download").forEach(btn => {
          btn.addEventListener("click", (e) => {
              e.stopPropagation();
              const idx = parseInt(btn.getAttribute("data-idx"), 10);
              const targetItem = summaryList[idx];
              if (targetItem && targetItem.rows && targetItem.rows.length) {
                  const fname = `Servicios_${safeFileName(targetItem.estadoItem)}_${safeFileName(targetItem.estadoServicio)}.xlsx`;
                  downloadExcel(targetItem.rows, fname);
              }
          });
      });
  }

  function setupSortListeners() {
      document.querySelectorAll('.serv-resumen-table th.sortable, th.sortable').forEach(th => {
          th.addEventListener('click', () => {
              const col = th.getAttribute('data-sort');
              if (!col) return;
              if (currentSort.col === col) {
                  currentSort.dir = currentSort.dir === 'asc' ? 'desc' : 'asc';
              } else {
                  currentSort.col = col;
                  currentSort.dir = col === 'count' ? 'desc' : 'asc';
              }
              applyAll();
          });
      });
  }

  function applyAll() {
      const selClientes = getSelValues("clienteSelect");
      const selCentros = getSelValues("centroSelect");
      const selPeriodos = getSelValues("clasif2Select");
      const selEstados = getSelValues("gcocSelect");
      const selGrupos = getSelValues("grupoCompraSelect");
      const selItemEst = getSelValues("estadoItemSelect"); 
      
      const filtered = data.filter(r => {
          const matchClie = !selClientes.length || selClientes.includes(r[CLIENT_COL_NAME]);
          const matchCent = !selCentros.length || selCentros.includes(r[CENTRO_COL_NAME]);
          const matchPeri = !selPeriodos.length || selPeriodos.includes(r[PERIODO_COL_NAME]);
          const matchEsta = !selEstados.length || selEstados.includes(r[ESTADO_COL_NAME]);
          const matchGrup = !selGrupos.length || selGrupos.includes(r[G_COMPRA_COL_NAME]);
          const matchItem = !selItemEst.length || selItemEst.includes(r[ESTADO_ITEM_COL]);
          return matchClie && matchCent && matchPeri && matchEsta && matchGrup && matchItem;
      });

      setText("kpiTotal", fmtInt(filtered.length));
      renderResumenTable(filtered);
      return filtered;
  }

  function fill(id, col) {
      const values = [...new Set(data.map(r => r[col]).filter(Boolean))].sort();
      const sel = getEl(id);
      if (!sel) return;
      sel.innerHTML = '<option value="__ALL__">Todos</option>';
      values.forEach(v => {
          const opt = document.createElement("option");
          opt.value = v; opt.textContent = v;
          sel.appendChild(opt);
      });
  }

  function resolveHeader(candidates, availableHeaders) {
      for (const cand of candidates) {
          const found = availableHeaders.find(h => clean(h).toLowerCase() === clean(cand).toLowerCase());
          if (found) return found;
      }
      return candidates[0];
  }

  /* ============================
     EXPOSE DEFERRED INITIALIZATION LIFE CYCLE HOOK
  =========================== */
  window.initServicios = function() {
      if (window.serviciosInitialized) return;
      window.serviciosInitialized = true;

      const buster = window.CACHE_BUSTER || new Date().getTime();
      fetchWithCache(csvUrl + "?t=" + buster)
      .then(text => {
          const rows = parseCSV(text);
          if (rows.length < 2) return;
          headers = rows[0].map(clean);

          CLIENT_COL_NAME = resolveHeader(["CLIENTE", "Cliente"], headers);
          CENTRO_COL_NAME = resolveHeader(["CENTRO", "Centro"], headers);
          PERIODO_COL_NAME = resolveHeader(["Período de certificación", "Periodo de certificación", "Período", "Periodo"], headers);
          ESTADO_COL_NAME = resolveHeader(["Estado Servicio", "ESTADO SERVICIO", "Estado servicio"], headers);
          G_COMPRA_COL_NAME = resolveHeader(["Grupo de Compra Definitivo", "GRUPO DE COMPRA", "Grupo de Compra"], headers);
          ESTADO_ITEM_COL = resolveHeader(["ESTADO ITEM", "Estado Item", "Estado item"], headers);

          data = rows.slice(1).map(row => {
              let o = {};
              headers.forEach((h, i) => o[h] = clean(row[i]));
              return o;
          }).filter(r => Object.values(r).some(v => v !== ""));

          fill("clienteSelect", CLIENT_COL_NAME);
          fill("centroSelect", CENTRO_COL_NAME);
          fill("clasif2Select", PERIODO_COL_NAME);
          fill("gcocSelect", ESTADO_COL_NAME);
          fill("grupoCompraSelect", G_COMPRA_COL_NAME);
          fill("estadoItemSelect", ESTADO_ITEM_COL);

          ["clienteSelect", "centroSelect", "clasif2Select", "gcocSelect", "grupoCompraSelect", "estadoItemSelect"].forEach(id => {
              getEl(id)?.addEventListener("change", () => {
                  applyAll();
              });
          });

          getEl("btnDownloadSelection")?.addEventListener("click", () => {
              const currentFiltered = applyAll();
              downloadExcel(currentFiltered, "Seleccion_Servicios.xlsx");
          });

          setupSortListeners();
          applyAll();

          const loader = getEl("loader");
          if (loader) loader.style.display = "none";
      })
      .catch(err => {
          console.error("Error al cargar servicios:", err);
          const loader = getEl("loader");
          if (loader) loader.style.display = "none";
      });
  };

  // Automatically initialize when the page is loaded
  if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", window.initServicios);
  } else {
      window.initServicios();
  }

})();
