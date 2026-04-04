import { weatherIcon, precipColor, windColor, windArrowSvg, splitLabel } from "./utils.js";

export function renderForecast(weather, marine) {
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

  const rows = [
    { raw: "天気", label: splitLabel("天気"), data: weatherCode.map(weatherIcon) },
    { raw: "降水量(mm)", label: splitLabel("降水量(mm)"), data: precip },
    { raw: "気温(℃)", label: splitLabel("気温(℃)"), data: temp },
    { raw: "風速(m/s)", label: splitLabel("風速(m/s)"), data: wind },
    { raw: "風向", label: splitLabel("風向"), data: windDir.map((d, i) => windArrowSvg(d, wind[i])) },
    { raw: "波高(m)", label: splitLabel("波高(m)"), data: wave },
    { raw: "うねり(m)", label: splitLabel("うねり(m)"), data: swell },
    { raw: "海水温(℃)", label: splitLabel("海水温(℃)"), data: sst }
  ];

  let html = `<table class="forecastTable"><thead><tr><th>日時</th>`;
  times.forEach(t => {
    const d = new Date(t);
    html += `<th>${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}時</th>`;
  });
  html += `</tr></thead><tbody>`;

  rows.forEach(row => {
    html += `<tr><td>${row.label}</td>`;
    row.data.forEach((v, i) => {
      let style = "";
      if (row.raw === "降水量(mm)") style = precipColor(v);
      if (row.raw === "風速(m/s)") style = `color:${windColor(v)};`;
      html += `<td style="${style}">${v}</td>`;
    });
    html += `</tr>`;
  });

  html += `</tbody></table>`;
  fc.innerHTML = html;
}