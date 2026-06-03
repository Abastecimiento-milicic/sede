/* Simple theme toggle (light/dark) for Sede Compliance Dashboard */
(function(){
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
