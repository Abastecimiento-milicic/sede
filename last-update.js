// Este archivo permite modificar la fecha y versión de actualización manualmente para todas las pestañas.
// Modifique los valores aquí abajo y se verán reflejados en todo el sitio.

const FECHA_ACTUALIZACION = "14/07/2026";
const VERSION_ACTUALIZACION = "v. 20260714";  //CAMBIAR AMBAS FECHAS

// Sincronizar el cache buster con la versión declarada arriba
let storedVersion = localStorage.getItem("APP_VERSION_TRACKER");
let cacheBuster = localStorage.getItem("APP_CACHE_BUSTER");

// Si la versión declarada cambió o no existe un buster previo, generamos uno nuevo y limpiamos la caché
if (storedVersion !== VERSION_ACTUALIZACION || !cacheBuster) {
    cacheBuster = Date.now().toString(36);
    localStorage.setItem("APP_CACHE_BUSTER", cacheBuster);
    localStorage.setItem("APP_VERSION_TRACKER", VERSION_ACTUALIZACION);
    
    // Limpiamos la caché de IndexedDB inmediatamente para asegurar datos frescos
    if (window.clearDataCache) {
        window.clearDataCache().catch(err => console.warn("Error limpiando IndexedDB: ", err));
    }
}

// Compartir las variables globalmente
window.FECHA_ACTUALIZACION = FECHA_ACTUALIZACION;
window.VERSION_ACTUALIZACION = VERSION_ACTUALIZACION;
window.CACHE_BUSTER = cacheBuster;

window.forceRefreshData = function() {
    // Forzamos un nuevo buster en el almacenamiento local y recargamos de verdad
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
