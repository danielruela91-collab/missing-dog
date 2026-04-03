// ==========================================
// Missing Dog Tobias - Clue Tracker App
// Cross-device persistence via Firebase Realtime Database
// ==========================================

const FIREBASE_DB = 'https://cade-tobias-default-rtdb.firebaseio.com';
const DB_PATH = '/missing-dog/sightings';

// BRT Praça do Bandolim, Curicica coordinates
const LAST_SEEN_LAT = -22.9483;
const LAST_SEEN_LNG = -43.3575;

// State
let map;
let tempMarker = null;
let sightingMarkers = [];

// ---- Firebase Realtime Database (REST API) ----

async function loadSightings() {
    try {
        const res = await fetch(`${FIREBASE_DB}${DB_PATH}.json`);
        if (!res.ok) throw new Error('Firebase error');
        const data = await res.json();
        if (!data) return [];
        // Firebase returns an object with keys; convert to sorted array
        return Object.entries(data)
            .map(([key, val]) => ({ ...val, firebaseKey: key }))
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (err) {
        console.error('Erro ao carregar pistas:', err);
        return [];
    }
}

async function addSighting(sighting) {
    sighting.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    sighting.createdAt = new Date().toISOString();
    try {
        const res = await fetch(`${FIREBASE_DB}${DB_PATH}.json`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sighting),
        });
        if (!res.ok) throw new Error('Firebase error');
        return sighting;
    } catch (err) {
        console.error('Erro ao salvar pista:', err);
        showToast('Erro ao salvar. Tente novamente.');
        return null;
    }
}

// ---- Map Setup ----

function initMap() {
    map = L.map('map').setView([LAST_SEEN_LAT, LAST_SEEN_LNG], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19
    }).addTo(map);

    // Last seen marker (special)
    const lastSeenIcon = L.divIcon({
        className: 'last-seen-marker',
        html: `<div style="
            background: #d32f2f;
            color: white;
            padding: 6px 12px;
            border-radius: 8px;
            font-weight: bold;
            font-size: 13px;
            white-space: nowrap;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            text-align: center;
        ">Visto pela última vez<br><small>BRT Praça do Bandolim</small></div>`,
        iconSize: [180, 50],
        iconAnchor: [90, 50]
    });

    L.marker([LAST_SEEN_LAT, LAST_SEEN_LNG], { icon: lastSeenIcon })
        .addTo(map)
        .bindPopup('<b>Último local visto</b><br>BRT Praça do Bandolim, Curicica');

    // Click to add sighting
    map.on('click', onMapClick);
}

function onMapClick(e) {
    const { lat, lng } = e.latlng;

    if (tempMarker) {
        map.removeLayer(tempMarker);
    }

    tempMarker = L.marker([lat, lng], {
        icon: L.divIcon({
            className: 'temp-marker',
            html: `<div style="
                background: #ff9800;
                color: white;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                border: 3px solid white;
            ">+</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        })
    }).addTo(map);

    document.getElementById('sighting-lat').value = lat;
    document.getElementById('sighting-lng').value = lng;
    document.getElementById('sighting-date').value = new Date().toISOString().split('T')[0];

    const form = document.getElementById('sighting-form');
    form.classList.remove('hidden');
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function createSightingIcon(index) {
    return L.divIcon({
        className: 'sighting-marker',
        html: `<div style="
            background: #1976d2;
            color: white;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            border: 2px solid white;
        ">${index}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
    });
}

async function renderSightingsOnMap() {
    sightingMarkers.forEach(m => map.removeLayer(m));
    sightingMarkers = [];

    const sightings = await loadSightings();

    sightings.forEach((s, i) => {
        const marker = L.marker([s.lat, s.lng], {
            icon: createSightingIcon(i + 1)
        }).addTo(map);

        const dateStr = formatDate(s.sightingDate, s.sightingTime);
        marker.bindPopup(`
            <b>${escapeHtml(s.name)}</b><br>
            <small>${dateStr}</small><br>
            ${escapeHtml(s.description)}
        `);

        sightingMarkers.push(marker);
    });
}

// ---- Clues List ----

async function renderCluesList() {
    const container = document.getElementById('clues-list');
    const sightings = await loadSightings();

    if (sightings.length === 0) {
        container.innerHTML = '<p class="no-clues">Nenhuma pista registrada ainda. Seja o primeiro a ajudar!</p>';
        return;
    }

    container.innerHTML = sightings.map((s, i) => {
        const dateStr = formatDate(s.sightingDate, s.sightingTime);
        return `
            <div class="clue-card">
                <div class="clue-header">
                    <span class="clue-author">${escapeHtml(s.name)}</span>
                    <span class="clue-date">${dateStr}</span>
                </div>
                <p class="clue-description">${escapeHtml(s.description)}</p>
                <span class="clue-location" onclick="flyToSighting(${s.lat}, ${s.lng})">
                    Ver no mapa
                </span>
            </div>
        `;
    }).join('');
}

function flyToSighting(lat, lng) {
    map.flyTo([lat, lng], 17, { duration: 1 });
}

// ---- Form Handling ----

function initForm() {
    const form = document.getElementById('clue-form');
    const cancelBtn = document.getElementById('cancel-sighting');

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const submitBtn = form.querySelector('.btn-primary');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Enviando...';

        const sighting = {
            name: document.getElementById('reporter-name').value.trim(),
            sightingDate: document.getElementById('sighting-date').value,
            sightingTime: document.getElementById('sighting-time').value,
            description: document.getElementById('sighting-description').value.trim(),
            lat: parseFloat(document.getElementById('sighting-lat').value),
            lng: parseFloat(document.getElementById('sighting-lng').value)
        };

        const result = await addSighting(sighting);

        submitBtn.disabled = false;
        submitBtn.textContent = 'Enviar Pista';

        if (!result) return;

        if (tempMarker) {
            map.removeLayer(tempMarker);
            tempMarker = null;
        }

        form.reset();
        document.getElementById('sighting-form').classList.add('hidden');

        await renderSightingsOnMap();
        await renderCluesList();

        showToast('Pista registrada com sucesso! Obrigado por ajudar!');
    });

    cancelBtn.addEventListener('click', function() {
        if (tempMarker) {
            map.removeLayer(tempMarker);
            tempMarker = null;
        }
        form.reset();
        document.getElementById('sighting-form').classList.add('hidden');
    });
}

// ---- Toast Notification ----

function showToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    Object.assign(toast.style, {
        position: 'fixed',
        bottom: '100px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#333',
        color: 'white',
        padding: '12px 24px',
        borderRadius: '8px',
        fontSize: '0.95rem',
        zIndex: '9999',
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        transition: 'opacity 0.4s'
    });
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 400);
    }, 400);
}

// ---- Helpers ----

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatDate(dateStr, timeStr) {
    if (!dateStr) return 'Data não informada';
    const parts = dateStr.split('-');
    let result = `${parts[2]}/${parts[1]}/${parts[0]}`;
    if (timeStr) result += ` às ${timeStr}`;
    return result;
}

// ---- Auto-refresh (sync from other devices) ----

setInterval(async () => {
    await renderSightingsOnMap();
    await renderCluesList();
}, 30000);

// ---- Init ----

document.addEventListener('DOMContentLoaded', async function() {
    initMap();
    initForm();
    await renderSightingsOnMap();
    await renderCluesList();
});
