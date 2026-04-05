// ==========================================
// Tobias Encontrado! - Clue Tracker App
// Cross-device persistence via Firebase Realtime Database
// ==========================================

const FIREBASE_DB = 'https://cade-tobias-default-rtdb.firebaseio.com';
const DB_PATH = '/missing-dog/sightings';

// BRT Praça do Bandolim, Curicica — corrected coordinates
const LAST_SEEN_LAT = -22.9347;
const LAST_SEEN_LNG = -43.3537;

// State
let map;
let sightingMarkers = [];

// ---- Firebase Realtime Database (REST API) ----

async function loadSightings() {
    try {
        const res = await fetch(`${FIREBASE_DB}${DB_PATH}.json`);
        if (!res.ok) throw new Error('Firebase error');
        const data = await res.json();
        if (!data) return [];
        return Object.entries(data)
            .map(([key, val]) => ({ ...val, firebaseKey: key }))
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (err) {
        console.error('Erro ao carregar pistas:', err);
        return [];
    }
}

// ---- Map Setup ----

function initMap() {
    map = L.map('map').setView([LAST_SEEN_LAT, LAST_SEEN_LNG], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19
    }).addTo(map);

    // Last seen marker
    const lastSeenIcon = L.divIcon({
        className: 'last-seen-marker',
        html: `<div style="
            background: #2e7d32;
            color: white;
            padding: 6px 12px;
            border-radius: 8px;
            font-weight: bold;
            font-size: 13px;
            white-space: nowrap;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            text-align: center;
        ">Encontrado!<br><small>BRT Praça do Bandolim</small></div>`,
        iconSize: [160, 50],
        iconAnchor: [80, 50]
    });

    L.marker([LAST_SEEN_LAT, LAST_SEEN_LNG], { icon: lastSeenIcon })
        .addTo(map)
        .bindPopup('<b>Tobias foi encontrado!</b><br>BRT Praça do Bandolim, Curicica');
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

        const dateStr = formatDate(s.sightingDate);
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
        container.innerHTML = '<p class="no-clues">Nenhuma pista registrada.</p>';
        return;
    }

    container.innerHTML = sightings.map((s, i) => {
        const dateStr = formatDate(s.sightingDate);
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

// ---- Helpers ----

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatDate(dateStr) {
    if (!dateStr) return 'Data não informada';
    const parts = dateStr.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
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
    }, 3000);
}

// ---- Init ----

function launchConfetti() {
    const duration = 4000;
    const end = Date.now() + duration;

    const colors = ['#4caf50', '#ffeb3b', '#2196f3', '#ff5722', '#e91e63', '#ffffff'];

    (function frame() {
        confetti({
            particleCount: 6,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: colors
        });
        confetti({
            particleCount: 6,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: colors
        });

        if (Date.now() < end) {
            requestAnimationFrame(frame);
        }
    })();
}

document.addEventListener('DOMContentLoaded', async function() {
    launchConfetti();
    initMap();
    await renderSightingsOnMap();
    await renderCluesList();
});
