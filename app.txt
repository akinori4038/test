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

  /* --- 最終更新日時 --- */
  function updateLastUpdateTime() {
    const now = new Date();

    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");

    const formatted = `${yyyy}/${mm}/${dd} ${hh}:${min}`;

    const fc = document.getElementById("forecast");

    const old = document.getElementById("lastUpdateTime");
    if (old) old.remove();

    const div = document.createElement("div");
    div.id = "lastUpdateTime";
    div.style.padding = "8px";
    div.style.fontSize = "14px";
    div.style.fontWeight = "600";
    div.textContent = "最終更新：" + formatted;

    fc.prepend(div);
  }

  /* --- 天気アイコン変換 --- */
  function weatherIcon(code) {
    if (code === 0) return "☀️";
    if (code === 1 || code === 2) return "🌤️";
    if (code === 3) return "☁️";
    if (code === 45 || code === 48) return "🌫️";
    if (code >= 51 && code <= 67) return "🌦️";
    if (code >= 71 && code <= 77) return "🌨️";
    if (code >= 80 && code <= 82) return "🌧️";
    if (code >= 95) return "⛈️";
    return "❓";
  }

  /* --- 降水量の色分け --- */
  function precipColor(p) {
    p = Number(p);

    if (p === 0) return "";
    if (p > 0 && p < 1) return "background:#d0e7ff;";
    if (p >= 1 && p < 5) return "background:#7fbfff;";
    if (p >= 5 && p < 20) return "background:#005bff; color:white;";
    if (p >= 20) return "background:#8000ff; color:white;";

    return "";
  }

  /* --- 鋭角 SVG 風向矢印（風速で色分け） --- */
  function windArrowSvg(deg, speed) {
    if (deg === null || deg === undefined) return "？";

    speed = Number(speed);
    const down = (deg + 180) % 360;

    let color = "#4da3ff"; // デフォルト（2〜3m/s）

    // ★ 1m/s 以下はグレー
    if (speed < 1) color = "#999999";
    else if (speed >= 1 && speed < 4) color = "#4da3ff";
    else if (speed >= 4 && speed < 7) color = "#3cb371";
    else if (speed >= 7 && speed < 10) color = "#ffa500";
    else if (speed >= 10 && speed < 20) color = "#ff4500";
    else if (speed >= 20) color = "#8000ff";
    const arrowSvg = `
      <svg width="22" height="22" viewBox="0 0 100 100">
        <polygon points="50,5 70,95 30,95" fill="${color}"/>
      </svg>
    `;

    return `
      <div style="
        width:22px;
        height:22px;
        display:flex;
        align-items:center;
        justify-content:center;
        transform: rotate(${down}deg);
      ">
        ${arrowSvg}
      </div>
    `;
  }

  /* --- 項目名と単位を2行に分ける --- */
  function splitLabel(label) {
    const match = label.match(/^(.+?)\((.+?)\)$/);
    if (!match) return label;
    const name = match[1];
    const unit = match[2];
    return `${name}<br><span style="font-size:12px; color:#555;">(${unit})</span>`;
  }

  /* --- 天気＋海況 API --- */
  async function fetchWeatherMarine(lat, lng) {
    const weatherUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&hourly=temperature_2m,wind_speed_10m,wind_direction_10m,weathercode,cloudcover,surface_pressure,precipitation&timezone=auto`;

    const marineUrl =
      `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}` +
      `&hourly=wave_height,wave_direction,wave_period,wind_wave_height,wind_wave_direction,wind_wave_period,` +
      `swell_wave_height,swell_wave_direction,swell_wave_period,sea_surface_temperature&timezone=auto`;

    try {
      const [wRes, mRes] = await Promise.all([fetch(weatherUrl), fetch(marineUrl)]);
      updateForecastDisplay(await wRes.json(), await mRes.json());
    } catch (e) {
      console.warn("天気/海況データ取得エラー");
      updateLastUpdateTime();
    }
  }

  /* --- 3日分 × 1時間予報の表 --- */
  function updateForecastDisplay(weather, marine) {
    updateLastUpdateTime();

    const fc = document.getElementById("forecast");

    const times = weather.hourly.time;
    const temp = weather.hourly.temperature_2m;
    const wind = weather.hourly.wind_speed_10m;
    const windDir = weather.hourly.wind_direction_10m;
    const weatherCode = weather.hourly.weathercode;
    const precip = weather.hourly.precipitation;

    const wave = marine.hourly.wave_height;
    const swell = marine.hourly.swell_wave_height;
    const sst = marine.hourly.sea_surface_temperature;

    const formattedTimes = times.slice(0, 72).map(t => {
      const d = new Date(t);
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const hh = String(d.getHours()).padStart(2, "0");
      return `${mm}/${dd} ${hh}時`;
    });

    const now = new Date();
    const nowMM = String(now.getMonth() + 1).padStart(2, "0");
    const nowDD = String(now.getDate()).padStart(2, "0");
    const nowHH = String(now.getHours()).padStart(2, "0");
    const nowLabel = `${nowMM}/${nowDD} ${nowHH}時`;

    const highlightIndex = formattedTimes.indexOf(nowLabel);

    let html = `
    <div class="forecastTableWrapper">
      <table class="forecastTable">
        <thead>
          <tr>
            <th>項目＼時間</th>
    `;

    for (let i = 0; i < 72; i++) {
      html += `<th>${formattedTimes[i]}</th>`;
    }

    html += `
          </tr>
        </thead>
        <tbody>
    `;

    /* --- rows を rawLabel + label の2つ持ちにする --- */
    const rows = [
      { rawLabel: "天気", label: splitLabel("天気"), data: weatherCode.map(c => weatherIcon(c)) },
      { rawLabel: "降水量(mm)", label: splitLabel("降水量(mm)"), data: precip },
      { rawLabel: "気温(℃)", label: splitLabel("気温(℃)"), data: temp },
      { rawLabel: "風速(m/s)", label: splitLabel("風速(m/s)"), data: wind },
      { rawLabel: "風向", label: splitLabel("風向"), data: windDir.map((d, i) => windArrowSvg(d, wind[i])) },
      { rawLabel: "波高(m)", label: splitLabel("波高(m)"), data: wave },
      { rawLabel: "うねり(m)", label: splitLabel("うねり(m)"), data: swell },
      { rawLabel: "海水温(℃)", label: splitLabel("海水温(℃)"), data: sst }
    ];

    rows.forEach(row => {
      html += `<tr><td>${row.label}</td>`;
      for (let i = 0; i < 72; i++) {

        let extraStyle = "";

        /* --- 降水量の色分け（rawLabel で判定） --- */
        if (row.rawLabel === "降水量(mm)") {
          extraStyle = precipColor(row.data[i]);
        }

        const highlightStyle = (i === highlightIndex)
          ? `background:#fff7b2; border-left:2px solid #e0b800; border-right:2px solid #e0b800;`
          : "";

        html += `<td style="${extraStyle} ${highlightStyle}">${row.data[i]}</td>`;
      }
      html += `</tr>`;
    });

    html += `
        </tbody>
      </table>
    </div>
    `;

    const lastUpdate = document.getElementById("lastUpdateTime");
    fc.innerHTML = "";
    fc.appendChild(lastUpdate);
    fc.insertAdjacentHTML("beforeend", html);
  }

  /* --- 位置更新（追従中のみ天気更新） --- */
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

    const isMapActive = document.getElementById("mapScreen").classList.contains("active");
    if (isMapActive) {
      map.panTo([lat, lng], { animate: false });
      fetchWeatherMarine(lat, lng);
    }
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

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            fetchWeatherMarine(lat, lng);
          },
          (err) => {
            console.warn("位置情報エラー:", err.message);
            updateLastUpdateTime();
          },
          {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 10000
          }
        );
      } else {
        console.warn("この端末では位置情報が利用できません。");
        updateLastUpdateTime();
      }
    }
  }

  tabMap.addEventListener("click", () => activateTab("map"));
  tabForecast.addEventListener("click", () => activateTab("forecast"));
});