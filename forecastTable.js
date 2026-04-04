import { weatherIcon, precipColor, windColor, windArrowSvg, splitLabel } from "./utils.js";

/* --- 最終更新日時を表示 --- */
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

export function renderForecast(weather, marine) {
  updateLastUpdateTime();

  const fc = document.getElementById("forecast");

  const times = weather.hourly.time.slice(0, 72);
  const temp = weather.hourly.temperature_2m;
  const wind = weather.hourly.wind_speed_10m;
  const windDir = weather.hourly.wind_direction_10m;
  const weatherCode = weather.hourly.weathercode;
  const precip = weather.hourly.precipitation;

  const wave = marine.hourly.wave_height;
  const swell = marine.hourly.swell_wave_height;
  const sst = marine.hourly.sea_surface_temperature;

  /* --- 現在時刻の列を特定 --- */
  const now = new Date();
  const nowMM = String(now.getMonth() + 1).padStart(2, "0");
  const nowDD = String(now.getDate()).padStart(2, "0");
  const nowHH = String(now.getHours()).padStart(2, "0");
  const nowLabel = `${nowMM}/${nowDD} ${nowHH}時`;

  const formattedTimes = times.map(t => {
    const d = new Date(t);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    return `${mm}/${dd} ${hh}時`;
  });

  const highlightIndex = formattedTimes.indexOf(nowLabel);

  /* --- 表の行データ --- */
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

  /* --- HTML生成（分割前仕様を完全再現） --- */
  let html = `
    <div class="forecastTableWrapper">
      <table class="forecastTable">
        <thead>
          <tr>
            <th>日時</th>
  `;

  formattedTimes.forEach(t => {
    html += `<th>${t}</th>`;
  });

  html += `
          </tr>
        </thead>
        <tbody>
  `;

  rows.forEach(row => {
    html += `<tr><td>${row.label}</td>`;

    for (let i = 0; i < 72; i++) {
      let extraStyle = "";
      let textColor = "";
      let highlightStyle = "";

      /* --- 降水量の背景色 --- */
      if (row.rawLabel === "降水量(mm)") {
        extraStyle = precipColor(row.data[i]);
      }

      /* --- 風速の文字色 --- */
      if (row.rawLabel === "風速(m/s)") {
        textColor = `color:${windColor(row.data[i])};`;
      }

      /* --- 現在時刻の列を黄色枠で囲む --- */
      if (i === highlightIndex) {
        highlightStyle = `border-left:2px solid #e0b800; border-right:2px solid #e0b800;`;
      }

      html += `<td style="${extraStyle} ${textColor} ${highlightStyle}">${row.data[i]}</td>`;
    }

    html += `</tr>`;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  /* --- 最終更新日時を残しつつテーブルを再描画 --- */
  const lastUpdate = document.getElementById("lastUpdateTime");
  fc.innerHTML = "";
  fc.appendChild(lastUpdate);
  fc.insertAdjacentHTML("beforeend", html);
}