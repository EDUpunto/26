// ====================================================================
// accionLFL.js - Carga independiente y robusta de capas GeoJSON
// ====================================================================

// 1. INICIALIZAR EL MAPA
var map = L.map('map').setView([19.03556466237287, -70.89432006796727], 8);

// 2. CAPA BASE (OpenStreetMap)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// 3. FUNCIÓN DE CARGA INDEPENDIENTE Y ROBUSTA
function cargarCapaIndependiente(url, estilo, nombreCapa) {
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            L.geoJSON(data, {
                // Nota: Leaflet ya maneja [longitud, latitud] por defecto en GeoJSON.
                // Se mantiene esta función solo si tus datos originales lo requieren específicamente.
                coordsToLatLng: function (coords) {
                    return new L.LatLng(coords[1], coords[0]);
                },
                style: estilo,
                onEachFeature: function (feature, layer) {
                    let props = feature.properties;
                    
                    // Plantilla literal (backticks) CORREGIDA y limpia para evitar errores HTML
                    let popupContent = `<div style="font-family: sans-serif; max-width: 250px;">` +
                                       `<h4 style="margin:0; color:#2c3e50; font-size: 16px;">${nombreCapa}</h4>` +
                                       `<hr style="margin: 8px 0; border: 0; border-top: 1px solid #ccc;">`;
                    
                    if (props) {
                        let hasData = false;
                        for (let key in props) {
                            // Filtramos valores nulos, indefinidos o cadenas vacías
                            if (props[key] !== null && props[key] !== undefined && String(props[key]).trim() !== "") {
                                popupContent += `<b>${key}:</b> ${props[key]}<br>`;
                                hasData = true;
                            }
                        }
                        if (!hasData) {
                            popupContent += `<p style="color: #666; font-style: italic;">Sin datos adicionales.</p>`;
                        }
                    } else {
                        popupContent += `<p style="color: #666; font-style: italic;">Sin datos adicionales.</p>`;
                    }
                    
                    popupContent += `</div>`;
                    layer.bindPopup(popupContent);
                }
            }).addTo(map);
            
            console.log(`✅ Capa cargada exitosamente: ${nombreCapa}`);
        })
        .catch(err => {
            // Usamos console.warn para que el fallo de un archivo NO detenga la carga de los demás
            console.warn(`⚠️ No se pudo cargar "${nombreCapa}" desde ${url}.`, err.message);
        });
}

// 4. CARGA DE TODAS LAS CAPAS (Hidrográficas y Adicionales)
// Cada llamada es independiente. Si un archivo falta (404), las demás se dibujarán igual.

// --- Capas Hidrográficas ---
cargarCapaIndependiente('cuencaTABARA.json', { color: 'green', weight: 2, fillOpacity: 0.3 }, 'Cuenca del río Tábara');
cargarCapaIndependiente('cauceTABARA.json', { color: 'blue', weight: 3 }, 'Cauce del río Tábara');

// --- Capas Adicionales (según tu HTML) ---
// Asegúrate de que estos archivos existan en la misma carpeta o ajusta la ruta si es necesario.
cargarCapaIndependiente('presas.json', { color: 'orange', weight: 2, radius: 6 }, 'Presas');
cargarCapaIndependiente('lagos.json', { color: 'cyan', weight: 1, fillOpacity: 0.5 }, 'Lagos');