/* Simple theme toggle (light/dark) and unified update configuration for Sede Compliance Dashboard */
(function(){
  // ============================================================================
  // CONFIGURACIÓN DE ACTUALIZACIÓN (Cargada desde last-update.js)
  // ============================================================================
  const FECHA_ACTUALIZACION = window.FECHA_ACTUALIZACION || "01/09/2026";
  const VERSION_ACTUALIZACION = window.VERSION_ACTUALIZACION || "v. 20260901_2";
  // ============================================================================

  const STORAGE_KEY = "abastecimiento_theme";
  const root = document.documentElement;

  function applyTheme(t){
    if (t === "dark") root.dataset.theme = "dark";
    else delete root.dataset.theme;

    // update icons if button exists
    document.querySelectorAll("#themeToggle i").forEach(i=>{
      i.classList.remove("bi-moon-stars","bi-sun");
      i.classList.add(t === "dark" ? "bi-sun" : "bi-moon-stars");
    });
  }

  const saved = localStorage.getItem(STORAGE_KEY);
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const initial = saved || (prefersDark ? "dark" : "light");
  applyTheme(initial);

  function toggle(){
    const current = root.dataset.theme === "dark" ? "dark" : "light";
    const next = current === "dark" ? "light" : "dark";
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }

  window.addEventListener("DOMContentLoaded", ()=>{
    document.querySelectorAll("#themeToggle").forEach(btn=>{
      btn.addEventListener("click", toggle);
    });

    // Unificar la fecha y versión de actualización en todas las ventanas
    const lastUpdateEl = document.getElementById("lastUpdate");
    if (lastUpdateEl) {
      lastUpdateEl.textContent = FECHA_ACTUALIZACION;
    }

    const updateBox = document.querySelector(".update-box");
    if (updateBox) {
      let versionEl = updateBox.querySelector(".update-version");
      if (!versionEl && VERSION_ACTUALIZACION) {
        versionEl = document.createElement("div");
        versionEl.className = "update-version";
        updateBox.appendChild(versionEl);
      }
      if (versionEl) {
        versionEl.textContent = VERSION_ACTUALIZACION;
      }
    }
  });

  // Global cache cleaner and page refresher
  window.forceRefreshData = async function() {
    try {
      const keys = await caches.keys();
      for (const key of keys) {
        await caches.delete(key);
      }
    } catch (e) {
      console.error("Error clearing caches:", e);
    }
    window.location.reload();
  };
})();
