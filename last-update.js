// Este archivo permite modificar la fecha y versión de actualización manualmente para todas las pestañas.
// Modifique los valores aquí abajo y se verán reflejados en todo el sitio.

const FECHA_ACTUALIZACION = "03/08/2026";
const VERSION_ACTUALIZACION = "v. 20260803";

// Utilizar localStorage para mantener la sesión de caché sincronizada entre pestañas y navegaciones
let cacheBuster = localStorage.getItem("APP_CACHE_BUSTER");
let storedVersion = localStorage.getItem("APP_VERSION");

if (!cacheBuster || storedVersion !== VERSION_ACTUALIZACION) {
    cacheBuster = Date.now().toString(36);
    localStorage.setItem("APP_CACHE_BUSTER", cacheBuster);
    localStorage.setItem("APP_VERSION", VERSION_ACTUALIZACION);
    if (window.clearDataCache) {
        window.clearDataCache();
    }
}

// Compartir las variables globalmente
window.FECHA_ACTUALIZACION = FECHA_ACTUALIZACION;
window.VERSION_ACTUALIZACION = VERSION_ACTUALIZACION;
window.CACHE_BUSTER = cacheBuster;

window.forceRefreshData = function() {
    // Forzamos un nuevo buster en el almacenamiento local
    localStorage.setItem("APP_CACHE_BUSTER", Date.now().toString(36));
    
    if (window.clearDataCache) {
        window.clearDataCache().then(() => {
            window.location.reload(true);
        });
    } else {
        window.location.reload(true);
    }
};
