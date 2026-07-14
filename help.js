/**
 * help.js — Sistema de modal de ayuda contextual para Cumplimiento Sede
 * Usar: openHelp("key")
 */
(function () {

    const HELP_CONTENT = {
        "filtros-cumplimiento": {
            title: "Filtros — Cumplimiento",
            body: `
                <h4>Cliente / Obra</h4>
                <p>Filtrá los pedidos por el nombre de la obra o cliente. Podés seleccionar varios con <strong>Ctrl + clic</strong>.</p>
                <h4>Clasificación</h4>
                <p>La clasificacion agrupa los grupos de compra de acuerdo al tipo de pedido solicitado.</p>
                <h4>GC OC</h4>
                <p>Filtrá por Grupo de Compra</p>
                <h4>Mes de Entrega</h4>
                <p>Seleccioná uno o varios meses (formato <em>MMM-AAAA</em>) para acotar el período analizado.</p>
                <h4>⬇ Descargar NO entregados</h4>
                <p>Exporta en CSV el listado de pedidos no entregados según los filtros activos.</p>
                <div class="hm-tip">💡 Si no seleccionás ningún filtro, se muestran todos los datos disponibles.</div>
            `
        },
        "kpis-acumulado": {
            title: "KPIs — Cumplimiento Acumulado",
            body: `
                <h4><span style="color:#3b82f6">📦 Comprometidos</span></h4>
                <p>Total de pedidos comprometidos en los últimos 12 meses: suma de AT + FT + No entregados.</p>
                <h4><span style="color:#10b981">✅ Entregados a Tiempo (AT)</span></h4>
                <p>Pedidos que llegaron en la fecha acordada o antes. Se muestra porcentaje y cantidad.</p>
                <h4><span style="color:#f59e0b">⏳ Entregados Fuera de Tiempo (FT)</span></h4>
                <p>Pedidos entregados después de la fecha comprometida. Generaron demora.</p>
                <h4><span style="color:#ef4444">🚫 No Entregados (NE)</span></h4>
                <p>Pedidos que aún no fueron entregados. Representan el mayor riesgo operativo.</p>
                <h4>📅 Demora Promedio</h4>
                <p>Días promedio de atraso de los pedidos FT.</p>
            `
        },
        "kpis-mes": {
            title: "KPIs — Mes Seleccionado",
            body: `
                <p>Esta fila muestra los mismos indicadores que la sección acumulada (Comprometidos, % AT, % FT, % NE, Demora) pero <strong>filtrados solo por el mes activo</strong> en el filtro &ldquo;Mes de Entrega&rdquo;.</p>
                <p>Si no hay ningún mes seleccionado, se muestra el mes más reciente con datos.</p>
                <div class="hm-tip">💡 El encabezado del panel indica exactamente qué mes se está mostrando.</div>
            `
        },
        "grafico-mes": {
            title: "Gráfico — Cumplimiento por Mes",
            body: `
                <p>El gráfico de barras apiladas nos muestra el cumplimiento mes a mes. Cada barra suma 100% que equivale a la cantidad de items 
                comprometidos a entregar y se divide en: Entregados a término (AT), Entregados fuera de término (FT) y No entregados (NE)</p>
                <div class="hm-tip">💡 El cumplimiento AT establecido para el año 2026 es del 78%.</div>
            `
        },
        "grafico-tendencia": {
            title: "Gráfico — Tendencia de Cumplimiento",
            body: `
                <p>Indica la tendencia/comportamiento de estos indicadores:<br>
                🔹Entregados a término (AT)<br>
                🔹Entregados fuera de término (FT)<br>
                🔹No entregados (NE)<br>
                🔹Promedio mensual acumulado(AT)<br></p>
                <div class="hm-tip">💡 La línea de tendencia ayuda a ver si el desempeño mejora o empeora a lo largo del tiempo.</div>
            `
        }
    };

    // ── Crear overlay + modal una sola vez ──────────────────────────────────
    const overlay = document.createElement('div');
    overlay.className = 'help-overlay';
    overlay.id = 'helpOverlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    overlay.innerHTML = `
    <div class="help-modal" id="helpModal">
      <div class="help-modal-header">
        <span class="help-modal-icon">ℹ️</span>
        <span class="help-modal-title" id="helpTitle"></span>
        <button class="help-modal-close" id="helpClose" aria-label="Cerrar ayuda">✕</button>
      </div>
      <div class="help-modal-body" id="helpBody"></div>
    </div>`;

    document.body.appendChild(overlay);

    function closeHelp() {
        overlay.classList.remove('help-overlay--open');
        document.body.style.overflow = '';
    }

    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeHelp();
    });

    document.getElementById('helpClose').addEventListener('click', closeHelp);

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeHelp();
    });

    function openHelp(idOrTitle, html) {
        let finalTitle = idOrTitle;
        let finalBody = html;

        if (HELP_CONTENT[idOrTitle]) {
            finalTitle = HELP_CONTENT[idOrTitle].title;
            finalBody = HELP_CONTENT[idOrTitle].body;
        }

        document.getElementById('helpTitle').textContent = finalTitle;
        document.getElementById('helpBody').innerHTML = finalBody;
        overlay.classList.add('help-overlay--open');
        document.body.style.overflow = 'hidden';
        setTimeout(() => document.getElementById('helpClose').focus(), 50);
    }

    window.openHelp = openHelp;
    window.closeHelp = closeHelp;

})();
