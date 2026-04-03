document.addEventListener("DOMContentLoaded", () => {

  // --- SVGシーカヤックアイコン ---
  const kayakSvg = `<svg width="60" height="60" viewBox="0 0 100 100"
  xmlns="http://www.w3.org/2000/svg">

    <!-- カヤック本体 -->
    <path d="M50 5 
             C60 20, 70 40, 70 50 
             C70 60, 60 80, 50 95
             C40 80, 30 60, 30 50
             C30 40, 40 20, 50 5 Z"
          fill="#ffcc33" stroke="#b8860b" stroke-width="3"/>

    <!-- コーミング -->
    <ellipse cx="50" cy="50" rx="12" ry="20"
             fill="#333" stroke="#111" stroke-width="3"/>

    <!-- デッキライン -->
    <line x1="50" y1="5" x2="50" y2="25"
          stroke="#ffffff" stroke-width="2" opacity="0.7"/>
    <line x1="50" y1="75" x2="50" y2="95"
          stroke="#ffffff" stroke-width="2" opacity="0.7"/>

  </svg>`;

  const kayakIcon = L.icon({
    iconUrl: "data:image/svg+xml;utf8," + encodeURIComponent(kayakSvg),
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

  // --- watchId ---
  let watchId = null;

  // --- 位置更新 ---
  function onLocationUpdate(pos) {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const heading = pos.coords.heading;

    if (!marker) {
      marker = L.marker([lat, lng], {
        icon: kayakIcon,
        rotationAngle: heading || 0,
        rotationOrigin: 'center center'
      }).addTo(map);
    } else {
      marker.setLatLng([lat, lng]);
      marker.setRotationAngle(heading || 0);
    }

    trackCoords.push([lat, lng]);
    trackLine.setLatLngs(trackCoords);

    // ★ ズームを変えずに位置だけ追従（ズーム保持）
    map.panTo([lat, lng], { animate: false });
  }

  function onError(err) {
    console.error(err);
    document.getElementById("status").textContent = "位置情報エラー: " + err.message;
  }

  // --- トグルボタン ---
  const locBtn = document.getElementById("locBtn");
  const status = document.getElementById("status");

  locBtn.addEventListener("click", () => {
    // 追従中 → 停止
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;

      locBtn.textContent = "追従開始";
      status.textContent = "追従停止中";
      return;
    }

    // 停止中 → 開始
    watchId = navigator.geolocation.watchPosition(onLocationUpdate, onError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000
    });

    locBtn.textContent = "追従停止";
    status.textContent = "追従中…";
  });

});