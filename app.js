document.addEventListener("DOMContentLoaded", () => {

  /* --- カヤックアイコン --- */
  const kayakSvg = `<svg width="60" height="60" viewBox="0 0 100 100"
xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="kayakBody" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#4de0d8"/>
      <stop offset="50%" stop-color="#1fb5ad"/>
      <stop offset="100%" stop-color="#0e7f79"/>
    </linearGradient>
    <linearGradient id="cockpitGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#777"/>
      <stop offset="100%" stop-color="#222"/>
    </linearGradient>
    <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.45)"/>
    </filter>
  </defs>
  <path d="M50 3 C56 22, 60 40, 60 50 C60 60, 56 78, 50 97 C44 78, 40 60, 40 50 C40 40, 44 22, 50 3 Z"
        fill="url(#kayakBody)" stroke="#0a5f5a" stroke-width="3" filter="url(#dropShadow)"/>
  <path d="M50 6 C55 22, 58 40, 58 50 C58 60, 55 78, 50 94"
        stroke="rgba(255,255,255,0.35)" stroke-width="3" fill="none"/>
  <ellipse cx="50" cy="50" rx="5" ry="15"
           fill="url(#cockpitGrad)" stroke="#000" stroke-width="3"/>
  <line x1="50" y1="3" x2="50" y2="22" stroke="#ffffff" stroke-width="2" opacity="0.6"/>
  <line x1="50" y1="78" x2="50" y2="97" stroke="#ffffff" stroke-width="2" opacity="0.6"/>
</svg>`;

  const kayakIcon = L.icon({
    iconUrl: "data:image/svg+xml;utf8," + encodeURIComponent(kayakSvg),
    iconSize: [76, 76],
    iconAnchor: [38, 38],
  });

  /* --- 地図 --- */
  const map = L.map('map').setView([35.681236, 139.767125], 5);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  let marker = null;
  let trackCoords = [];
  let trackLine = L.polyline([], { color: 'red', weight: 3 }).addTo(map);
  let watchId = null;

  /* --- 天気＋海況 API --- */
  async function fetchWeatherMarine(lat, lng) {
    const weatherUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&hourly=temperature_2m,wind_speed_10m,wind_direction_10m,weathercode,cloudcover,surface_pressure&timezone=auto`;

    const marineUrl =
      `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}` +
      `&hourly=wave_height,wave_direction,wave_period,wind_wave_height,wind_wave_direction,wind_wave_period,` +
      `swell_wave_height,swell_wave_direction,swell_wave_period,sea_surface_temperature&timezone=auto`;

    try {
      const [wRes, mRes] = await Promise.all([fetch(weatherUrl), fetch(marineUrl)]);
      updateForecastDisplay(await wRes.json(), await mRes.json());
    } catch (e) {
      document.getElementById("forecast").textContent = "天気/海況データ取得エラー";
    }
  }

  /* --- 3日分 × 1時間予報の表を生成 --- */
  function updateForecastDisplay(weather, marine) {
    const fc = document.getElementById("forecast");

    const times = weather.hourly.time;
    const temp = weather.hourly.temperature_2m;
    const wind = weather.hourly.wind_speed_10m;
    const windDir = weather.hourly.wind_direction_10m;

    const wave = marine.hourly.wave_height;
    const waveDir = marine.hourly.wave_direction;
    const sst = marine.hourly.sea_surface_temperature;

    let html = `
      <div class="forecastTableWrapper">
        <table class="forecastTable">
          <thead>
            <tr>
              <th>日時</th>
              <th>気温(℃)</th>
              <th>風速(m/s)</th>
              <th>風向(°)</th>
              <th>波高(m)</th>
              <th>波向(°)</th>
              <th>海面水温(℃)</th>
            </tr>
          </thead>
          <tbody>
    `;

    for (let i = 0; i < 72; i++) {
      html += `
        <tr>
          <td>${times[i]}</td>
          <td>${temp[i]}</td>
          <td>${wind[i]}</td>
          <td>${windDir[i]}</td>
          <td>${wave[i]}</td>
          <td>${waveDir[i]}</td>
          <td>${sst[i]}</td>
        </tr>
      `;
    }

    html += `
          </tbody>
        </table>
      </div>
    `;

    fc.innerHTML = html;
  }

  /* --- 位置更新（追従中の横スクロール戻り対策あり） --- */
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

    /* ★★★ 重要：地図タブのときだけ panTo() を実行する ★★★ */
    const isMapActive = document.getElementById("mapScreen").classList.contains("active");
    if (isMapActive) {
      map.panTo([lat, lng], { animate: false });
    }

    fetchWeatherMarine(lat, lng);
  }

  function onError(err) {
    document.getElementById("status").textContent = "位置情報エラー: " + err.message;
  }

  /* --- 追従トグル --- */
  const locBtn = document.getElementById("locBtn");
  const status = document.getElementById("status");

  locBtn.addEventListener("click", () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
      locBtn.textContent = "追従開始";
      status.textContent = "追従停止中";
      return;
    }

    watchId = navigator.geolocation.watchPosition(onLocationUpdate, onError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000
    });

    locBtn.textContent = "追従停止";
    status.textContent = "追従中…";
  });

  /* --- タブ切り替え --- */
  const tabMap = document.getElementById("tabMap");
  const tabForecast = document.getElementById("tabForecast");

  const mapScreen = document.getElementById("mapScreen");
  const forecastScreen = document.getElementById("forecastScreen");

  function activateTab(target) {
    if (target === "map") {
      tabMap.classList.add("active");
      tabForecast.classList.remove("active");

      mapScreen.classList.add("active");
      forecastScreen.classList.remove("active");

      setTimeout(() => map.invalidateSize(), 50);

    } else {
      tabForecast.classList.add("active");
      tabMap.classList.remove("active");

      forecastScreen.classList.add("active");
      mapScreen.classList.remove("active");

      // ★ タブを開いたタイミングで現在位置を1回だけ取得して天気・海況を更新
      if (navigator.geolocation) {
        document.getElementById("forecast").textContent = "天気・海況データを取得中…";

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            fetchWeatherMarine(lat, lng);
          },
          (err) => {
            document.getElementById("forecast").textContent =
              "位置情報エラー: " + err.message;
          },
          {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 10000
          }
        );
      } else {
        document.getElementById("forecast").textContent =
          "この端末では位置情報が利用できません。";
      }
    }
  }

  tabMap.addEventListener("click", () => activateTab("map"));
  tabForecast.addEventListener("click", () => activateTab("forecast"));
});