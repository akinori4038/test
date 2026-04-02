// --- SVG船アイコン ---
const shipSvg = `
<svg width="60" height="60" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <path d="M50 5 L80 85 L50 70 L20 85 Z" fill="#1e90ff" stroke="#003f6b" stroke-width="4"/>
  <ellipse cx="50" cy="45" rx="18" ry="8" fill="#ffffff" stroke="#003f6b" stroke-width="3"/>
  <line x1="50" y1="5" x2="50" y2="25" stroke="#ffffff" stroke-width="3"/>
</svg>
`;

const shipIcon = L.icon({
  iconUrl: "data:image/svg+xml;base64," + btoa(shipSvg),
  iconSize: [50, 50],
  iconAnchor: [25, 25],
});

// --- 地図初期化 ---
const map = L.map('map').setView([35.681236, 139.767125], 5);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let marker = null;

// --- トラックライン ---
let trackCoords = [];
let trackLine = L.polyline([], { color: 'red', weight: 3 }).addTo(map);

// --- 位置更新処理 ---
function onLocationUpdate(pos) {
  const lat = pos.coords.latitude;
  const lng = pos.coords.longitude;
  const heading = pos.coords.heading; // 0〜360

  // マーカー更新
  if (!marker) {
    marker = L.marker([lat, lng], {
      icon: shipIcon,
      rotationAngle: heading || 0,
      rotationOrigin: 'center center'
    }).addTo(map);
  } else {
    marker.setLatLng([lat, lng]);
    marker.setRotationAngle(heading || 0);
  }

  // トラック追加
  trackCoords.push([lat, lng]);
  trackLine.setLatLngs(trackCoords);

  // 地図追従
  map.setView([lat, lng], 17);
}

function onError(err) {
  console.error(err);
}

// --- 現在地追従開始 ---
navigator.geolocation.watchPosition(onLocationUpdate, onError, {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 10000
});