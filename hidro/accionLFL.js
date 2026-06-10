// ═══════════════════════════════════════════════════════════
// 1. INICIALIZAR EL MAPA — centrado en RD
// ═══════════════════════════════════════════════════════════
var map = L.map('map', { zoomControl: false }).setView([19.03556466237287, -70.89432006796727], 8);

// ═══════════════════════════════════════════════════════════
// 2. CAPAS BASE
// ═══════════════════════════════════════════════════════════
var capaOSM = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
});

var capaSatelite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri'
});

capaOSM.addTo(map);

// Función global para cambiar capa base
window.cambiarBase = function(tipo) {
    if (tipo === 'satelite') {
        map.removeLayer(capaOSM);
        capaSatelite.addTo(map);
    } else {
        map.removeLayer(capaSatelite);
        capaOSM.addTo(map);
    }
};

// ═══════════════════════════════════════════════════════════
// 3. ESTADO GLOBAL DE CUENCAS
// ═══════════════════════════════════════════════════════════
var todasLasCuencas = [];   // { nombre, layerCuenca, layerCauce, bounds }
var cuencaActiva = null;
var capaVisible = 'ambos';  // 'cuenca' | 'cauce' | 'ambos'

// ═══════════════════════════════════════════════════════════
// 4. ESTILOS
// ═══════════════════════════════════════════════════════════
var estiloCuencaNormal = {
    color: "#27ae60",
    weight: 1.5,
    fillColor: "#2ecc71",
    fillOpacity: 0.18,
    opacity: 0.8
};

var estiloCuencaDestacada = {
    color: "#f39c12",
    weight: 2.5,
    fillColor: "#f1c40f",
    fillOpacity: 0.35,
    opacity: 1
};

var estiloCuencaOculta = {
    color: "#27ae60",
    weight: 1,
    fillColor: "#2ecc71",
    fillOpacity: 0.04,
    opacity: 0.15
};

var estiloCauceNormal = {
    color: "#2980b9",
    weight: 3,
    opacity: 0.85,
    lineCap: 'round'
};

var estiloCauceDestacado = {
    color: "#3498db",
    weight: 4.5,
    opacity: 1,
    lineCap: 'round'
};

var estiloCauceOculto = {
    color: "#2980b9",
    weight: 1.5,
    opacity: 0.12,
    lineCap: 'round'
};

// ═══════════════════════════════════════════════════════════
// 5. FUNCIÓN PARA CONSTRUIR POPUP
//    tipo: 'cuenca' → muestra título + descripción
//    tipo: 'cauce'  → muestra solo el nombre del río como título
// ═══════════════════════════════════════════════════════════
function construirPopup(properties, nombreCapa, tipo) {
    var titulo = nombreCapa || 'Cuenca hidrográfica';
    var html = '<div style="font-family:\'Segoe UI\',sans-serif; max-width:260px;">';
    html += '<div style="font-weight:700; font-size:13px; color:#1a5276; margin-bottom:6px; border-bottom:2px solid #2980b9; padding-bottom:4px;">💧 ' + titulo + '</div>';

    if (tipo !== 'cauce') {
        // Buscar campo "Name" (case-insensitive) solo para cuencas
        var descripcion = null;
        if (properties) {
            Object.keys(properties).forEach(function(key) {
                if (key.toLowerCase() === 'name') {
                    descripcion = properties[key];
                }
            });
        }
        if (descripcion && descripcion.trim() !== '') {
            html += '<div style="font-size:12px; color:#333; line-height:1.5;">' + descripcion + '</div>';
        } else {
            html += '<div style="font-size:12px; color:#888; font-style:italic;">Sin descripción disponible.</div>';
        }
    }

    html += '</div>';
    return html;
}

// ═══════════════════════════════════════════════════════════
// 6. CAMBIAR VISIBILIDAD DE CAPAS (Cuenca / Cauce / Ambos)
// ═══════════════════════════════════════════════════════════
window.cambiarCapas = function(modo) {
    capaVisible = modo;

    // Actualizar botones activos
    ['cuenca', 'cauce', 'ambos'].forEach(function(m) {
        var btn = document.getElementById('btn-capa-' + m);
        if (btn) btn.classList.toggle('active', m === modo);
    });

    todasLasCuencas.forEach(function(c) {
        var estaActiva = (c === cuencaActiva);
        var mostrarCuenca = (modo === 'cuenca' || modo === 'ambos');
        var mostrarCauce  = (modo === 'cauce'  || modo === 'ambos');

        // Cuenca
        if (mostrarCuenca) {
            if (!map.hasLayer(c.layerCuenca)) c.layerCuenca.addTo(map);
            c.layerCuenca.setStyle(estaActiva ? estiloCuencaDestacada :
                (cuencaActiva ? estiloCuencaOculta : estiloCuencaNormal));
        } else {
            if (map.hasLayer(c.layerCuenca)) map.removeLayer(c.layerCuenca);
        }

        // Cauce
        if (mostrarCauce) {
            if (!map.hasLayer(c.layerCauce)) c.layerCauce.addTo(map);
            c.layerCauce.setStyle(estaActiva ? estiloCauceDestacado :
                (cuencaActiva ? estiloCauceOculto : estiloCauceNormal));
        } else {
            if (map.hasLayer(c.layerCauce)) map.removeLayer(c.layerCauce);
        }
    });

    // Actualizar leyenda
    var itemCuenca = document.querySelector('#panel-leyenda .item-leyenda:nth-child(2)');
    var itemCauce  = document.querySelector('#panel-leyenda .item-leyenda:nth-child(3)');
    if (itemCuenca) itemCuenca.style.display = (modo === 'cauce')  ? 'none' : 'flex';
    if (itemCauce)  itemCauce.style.display  = (modo === 'cuenca') ? 'none' : 'flex';
};

// ═══════════════════════════════════════════════════════════
// 7. SELECCIÓN DE CUENCA (con actualización de leyenda)
// ═══════════════════════════════════════════════════════════
function seleccionarCuenca(entrada) {
    cuencaActiva = entrada;

    // Actualizar etiqueta en el panel de cuenca seleccionada
    var el = document.getElementById('nombreCuenca');
    if (el) el.textContent = entrada.nombre;

    // Mostrar botón "Mostrar todas"
    var btnMostrar = document.getElementById('btn-mostrar-todas');
    if (btnMostrar) btnMostrar.style.display = 'block';

    // Aplicar estilos a las capas respetando capaVisible
    todasLasCuencas.forEach(function(c) {
        var mostrarCuenca = (capaVisible === 'cuenca' || capaVisible === 'ambos');
        var mostrarCauce  = (capaVisible === 'cauce'  || capaVisible === 'ambos');

        if (c === entrada) {
            if (mostrarCuenca) {
                if (!map.hasLayer(c.layerCuenca)) c.layerCuenca.addTo(map);
                c.layerCuenca.setStyle(estiloCuencaDestacada);
                c.layerCuenca.bringToFront();
            }
            if (mostrarCauce) {
                if (!map.hasLayer(c.layerCauce)) c.layerCauce.addTo(map);
                c.layerCauce.setStyle(estiloCauceDestacado);
                c.layerCauce.bringToFront();
            }
        } else {
            if (mostrarCuenca) c.layerCuenca.setStyle(estiloCuencaOculta);
            if (mostrarCauce)  c.layerCauce.setStyle(estiloCauceOculto);
        }
    });

    // Resaltar el ícono de la leyenda de "Cuenca" con color de selección
    var leyendaCuenca = document.getElementById('leyenda-cuenca');
    if (leyendaCuenca) {
        leyendaCuenca.classList.add('resaltado');
    }

    // Hacer zoom a la cuenca seleccionada
    if (entrada.bounds && entrada.bounds.isValid()) {
        map.fitBounds(entrada.bounds, { padding: [30, 30] });
    }
}

// ═══════════════════════════════════════════════════════════
// 7. MOSTRAR TODAS (restaura leyenda)
// ═══════════════════════════════════════════════════════════
window.mostrarTodas = function() {
    cuencaActiva = null;

    var el = document.getElementById('nombreCuenca');
    if (el) el.textContent = '— ninguna —';

    var btnMostrar = document.getElementById('btn-mostrar-todas');
    if (btnMostrar) btnMostrar.style.display = 'none';

    todasLasCuencas.forEach(function(c) {
        var mostrarCuenca = (capaVisible === 'cuenca' || capaVisible === 'ambos');
        var mostrarCauce  = (capaVisible === 'cauce'  || capaVisible === 'ambos');

        if (mostrarCuenca) {
            if (!map.hasLayer(c.layerCuenca)) c.layerCuenca.addTo(map);
            c.layerCuenca.setStyle(estiloCuencaNormal);
        } else {
            if (map.hasLayer(c.layerCuenca)) map.removeLayer(c.layerCuenca);
        }
        if (mostrarCauce) {
            if (!map.hasLayer(c.layerCauce)) c.layerCauce.addTo(map);
            c.layerCauce.setStyle(estiloCauceNormal);
        } else {
            if (map.hasLayer(c.layerCauce)) map.removeLayer(c.layerCauce);
        }
    });

    // Restaurar el color normal de la leyenda
    var leyendaCuenca = document.getElementById('leyenda-cuenca');
    if (leyendaCuenca) {
        leyendaCuenca.classList.remove('resaltado');
    }

    map.setView([19.03556466237287, -70.89432006796727], 8);
};

// ═══════════════════════════════════════════════════════════
// 8. CARGA DE GEOJSON CON COORDENADAS CORREGIDAS Y POPUP LIMPIO
// ═══════════════════════════════════════════════════════════
function cargarParCuenca(urlCuenca, urlCauce, nombreCapa) {
    var entrada = {
        nombre: nombreCapa,
        layerCuenca: null,
        layerCauce: null,
        bounds: null
    };

    // Cargar cuenca
    fetch(urlCuenca)
        .then(function(r) { if (!r.ok) throw new Error('Error ' + urlCuenca); return r.json(); })
        .then(function(data) {
            var layer = L.geoJSON(data, {
                coordsToLatLng: function(coords) { return new L.LatLng(coords[1], coords[0]); },
                style: estiloCuencaNormal,
                onEachFeature: function(feature, fl) {
                    var popupContent = construirPopup(feature.properties, nombreCapa, 'cuenca');
            entrada.bounds = layer.getBounds();

            if (entrada.layerCauce) todasLasCuencas.push(entrada);
        })
        .catch(function(e) { console.warn('Cuenca no cargada:', nombreCapa, e); });

    // Cargar cauce
    fetch(urlCauce)
        .then(function(r) { if (!r.ok) throw new Error('Error ' + urlCauce); return r.json(); })
        .then(function(data) {
            var layer = L.geoJSON(data, {
                coordsToLatLng: function(coords) { return new L.LatLng(coords[1], coords[0]); },
                style: estiloCauceNormal,
                onEachFeature: function(feature, fl) {
                    var popupContent = construirPopup(feature.properties, nombreCapa, 'cauce');

            if (entrada.layerCuenca) todasLasCuencas.push(entrada);
        })
        .catch(function(e) { console.warn('Cauce no cargado:', nombreCapa, e); });
}

// ═══════════════════════════════════════════════════════════
// 9. CARGAR TODAS LAS CUENCAS
// ═══════════════════════════════════════════════════════════
cargarParCuenca('cuencaOZAMA.geojson',       'cauceOZAMA.geojson',       'Cuenca del río Ozama');
cargarParCuenca('cuencaYUMA.geojson',        'cauceYUMA.geojson',        'Cuenca del río Yuma');
cargarParCuenca('cuencaMAIMONESTE.geojson',  'cauceMAIMONESTE.geojson',  'Cuenca del río Maimón del Este');
cargarParCuenca('cuencaANAMUYA.json',        'cauceANAMUYA.json',        'Cuenca del río Anamuya');
cargarParCuenca('cuencaTOSA.json',           'cauceTOSA.json',           'Cuenca del río Tosa o Brujuelas');
cargarParCuenca('cuencaHIGUAMO.json',        'cauceHIGUAMO.json',        'Cuenca del río Higuamo');
cargarParCuenca('cuencaSOCO.json',           'cauceSOCO.json',           'Cuenca del río Soco');
cargarParCuenca('cuencaCUMAYASA.json',       'cauceCUMAYASA.json',       'Cuenca del río Cumayasa');
cargarParCuenca('cuencaROMANA.json',         'cauceROMANA.json',         'Cuenca del río Romana, Dulce o Salado');
cargarParCuenca('cuencaCHAVON.json',         'cauceCHAVON.json',         'Cuenca del río Chavón');
cargarParCuenca('cuencaYABON.json',          'cauceYABON.json',          'Cuenca del río Yabón');
cargarParCuenca('cuencaMAGUA.json',          'cauceMAGUA.json',          'Cuenca del río Maguá');
cargarParCuenca('cuencaCUARON.json',         'cauceCUARON.json',         'Cuenca del río Cuarón');
cargarParCuenca('cuencaJOVERO.json',         'cauceJOVERO.json',         'Cuenca del río Jovero');
cargarParCuenca('cuencaYEGUADA.json',        'cauceYEGUADA.json',        'Cuenca del río Yeguada');
cargarParCuenca('cuencaYUNA.geojson',        'cauceYUNA.geojson',        'Cuenca del río Yuna');
cargarParCuenca('cuencaYNORTE.geojson',      'cauceYNORTE.geojson',      'Cuenca del río Yaque del Norte');
cargarParCuenca('cuencaBACUI.geojson',       'cauceBACUI.geojson',       'Cuenca del río Bacuí');
cargarParCuenca('cuencaBAJABONICO.geojson',  'cauceBAJABONICO.geojson',  'Cuenca del río Bajabonico');
cargarParCuenca('cuencaBOBA.geojson',        'cauceBOBA.geojson',        'Cuenca del río Boba');
cargarParCuenca('cuencaELLIMON.geojson',     'cauceELLIMON.geojson',     'Cuenca del río El Limón');
cargarParCuenca('cuencaJOBA.geojson',        'cauceJOBA.geojson',        'Cuenca del río Joba');
cargarParCuenca('cuencaMAIMONCIBAO.geojson', 'cauceMAIMONCIBAO.geojson', 'Cuenca del río Maimón del norte');
cargarParCuenca('cuencaSMARCOS.geojson',     'cauceSMARCOS.geojson',     'Cuenca del río San Marcos');
cargarParCuenca('cuencaNAGUA.geojson',       'cauceNAGUA.geojson',       'Cuenca del río Nagua');
cargarParCuenca('cuencaSJUANCIBAO.geojson',  'cauceSJUANCIBAO.geojson',  'Cuenca del río San Juan del Cibao');
cargarParCuenca('cuencaYASICA.geojson',      'cauceYASICA.geojson',      'Cuenca del río Yásica');
cargarParCuenca('cuencaCAMU.json',           'cauceCAMU.json',           'Cuenca del río Camú del norte');
cargarParCuenca('cuencaMASACRE.json',        'cauceMASACRE.json',        'Cuenca del río Dajabón o Masacre');
cargarParCuenca('cuencaCHACUEY.json',        'cauceCHACUEY.json',        'Cuenca del río Chacuey');
cargarParCuenca('cuencaHAINA.json',          'cauceHAINA.json',          'Cuenca del río Haina');
cargarParCuenca('cuencaNIGUA.json',          'cauceNIGUA.json',          'Cuenca del río Nigua');
cargarParCuenca('cuencaNIZAO.json',          'cauceNIZAO.json',          'Cuenca del río Nizao');
cargarParCuenca('cuencaOCOA.json',           'cauceOCOA.json',           'Cuenca del río Ocoa');
cargarParCuenca('cuencaJURA.json',           'cauceJURA.json',           'Cuenca del río Jura');
cargarParCuenca('cuencaTABARA.json',         'cauceTABARA.json',         'Cuenca del río Tábara');
cargarParCuenca('cuencaYSUR.json',           'cauceYSUR.json',           'Cuenca del río Yaque del Sur');
cargarParCuenca('cuencaNIZAITO.json',        'cauceNIZAITO.json',        'Cuenca del río Nizaito');
cargarParCuenca('cuencaPEDERNALES.json',     'caucePEDERNALES.json',     'Cuenca del río Pedernales');
cargarParCuenca('cuencaVIA.json',            'cauceVIA.json',            'Cuenca del río Vía');
cargarParCuenca('cuencaBANI.json',           'cauceBANI.json',           'Cuenca del río Baní / Banilejo');
cargarParCuenca('cuencaARTIBONITO.json',     'cauceARTIBONITO.json',     'Cuenca del río Artibonito');