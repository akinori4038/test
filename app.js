// ===============================
// 画面切り替え（シングルビュー方式）
// ===============================
const tabMap = document.getElementById("tabMap");
const tabForecast = document.getElementById("tabForecast");

const mapScreen = document.getElementById("mapScreen");
const forecastScreen = document.getElementById("forecastScreen");

// タブ切り替え
tabMap.addEventListener("click", () => {
  tabMap.classList.add("active");
  tabForecast.classList.remove("active");

  mapScreen.classList.add("active");
  forecastScreen.classList.remove("active");

  // Leaflet の地図が非表示 → 再表示された時に必要
  setTimeout(() => {
    if (window._leafletMap) {
      window._leafletMap.invalidateSize();
    }
  }, 50);
});

tabForecast.addEventListener("click", () => {
  tabForecast.classList.add("active");
  tabMap.classList.remove("active");

  forecastScreen.classList.add("active");
  mapScreen.classList.remove("active");
});


// ===============================
// Leaflet 地図の初期化
// ===============================
const map = L.map("map", {
  zoomControl: false,
  attributionControl: false
}).setView([35.45, 139.65], 12);

window._leafletMap = map; // invalidateSize() 用に保持

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19
}).addTo(map);


// ===============================
// 中央固定チェック
// ===============================
const trackChk = document.getElementById("trackChk");
let isTracking = true;

trackChk.addEventListener("change", () => {
  isTracking = trackChk.checked;
});


// ===============================
// WP距離・方向の表示
// ===============================
const navInfo = document.getElementById("navInfo");
let waypoint = null;

map.on("click", (e) => {
  waypoint = e.latlng;
  updateNavInfo();
});

function updateNavInfo() {
  if (!waypoint) {
    navInfo.textContent = "";
    return;
  }

  const center = map.getCenter();
  const dist = center.distanceTo(waypoint); // m
  const bearing = calcBearing(center, waypoint);

  navInfo.textContent =
    `距離: ${(dist / 1000).toFixed(2)} km\n方位: ${bearing.toFixed(0)}°`;
}

function calcBearing(a, b) {
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const dLon = (b.lng - a.lng) * Math.PI / 180;

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}


// ===============================
// 軌跡 ON/OFF
// ===============================
let pathEnabled = false;
let pathLine = L.polyline([], { color: "red", weight: 3 }).addTo(map);

document.getElementById("pathBtn").addEventListener("click", () => {
  pathEnabled = !pathEnabled;
  document.getElementById("pathBtn").textContent = pathEnabled ? "軌跡ON" : "軌跡OFF";

  if (!pathEnabled) {
    pathLine.setLatLngs([]);
  }
});


// ===============================
// 現在位置の追跡
// ===============================
map.locate({ watch: true, enableHighAccuracy: true });

map.on("locationfound", (e) => {
  if (pathEnabled) {
    pathLine.addLatLng(e.latlng);
  }

  if (isTracking) {
    map.setView(e.latlng);
  }

  updateNavInfo();
});


// ===============================
// 天気・海況データの取得
// ===============================
import { renderForecast } from "./forecastTable.js";

async function loadForecast() {
  const lat = 35.45;
  const lon = 139.65;

  const urlWeather =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&hourly=temperature_2m,wind_speed_10m,wind_direction_10m,weathercode,precipitation`;

  const urlMarine =
    `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}` +
    `&hourly=wave_height,swell_wave_height,sea_surface_temperature`;

  const w = await fetch(urlWeather).then(r => r.json());
  const m = await fetch(urlMarine).then(r => r.json());

  renderForecast(w, m);
}

loadForecast();