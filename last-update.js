// ==========================================
// ÚNICO LUGAR DONDE CAMBIARÁS LA VERSIÓN
// ==========================================
const FECHA_ACTUALIZACION = "14/07/2026";
const VERSION_ACTUALIZACION = "v. 20260714"; // CAMBIAR AMBAS FECHAS!!

// Creamos un buster basado estrictamente en el texto de la versión
// Al remover puntos, espacios y la "v", "v. 20260715" se convierte en "20260715"
const cleanVersion = VERSION_ACTUALIZACION.replace(/[^\d]/g, "");

// Sincronizar el localStorage para limpiar IndexedDB de inmediato
let storedVersion = localStorage.getItem("APP_VERSION_TRACKER");
if (storedVersion !== VERSION_ACTUALIZACION) {
    localStorage.setItem("APP_CACHE_BUSTER", cleanVersion);
    localStorage.setItem("APP_VERSION_TRACKER", VERSION_ACTUALIZACION);
    
    // Si IndexedDB tiene datos viejos, los borramos
    if (window.clearDataCache) {
        window.clearDataCache().catch(err => console.warn("Error limpiando IndexedDB:", err));
    }
}

// Compartir las variables globalmente
window.FECHA_ACTUALIZACION = FECHA_ACTUALIZACION;
window.VERSION_ACTUALIZACION = VERSION_ACTUALIZACION;
window.CACHE_BUSTER = cleanVersion; // Compartimos el buster limpio para el fetch del CSV

window.forceRefreshData = function() {
    localStorage.setItem("APP_CACHE_BUSTER", Date.now().toString(36));
    if (window.clearDataCache) {
        window.clearDataCache().then(() => {
            window.location.reload(true);
        }).catch(() => {
            window.location.reload(true);
        });
    } else {
        window.location.reload(true);
    }
};
