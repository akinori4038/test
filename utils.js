/* --- 天気アイコン変換（分割前仕様を完全再現） --- */
export function weatherIcon(code) {
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

/* --- 降水量の色分け（分割前仕様を完全再現） --- */
export function precipColor(p) {
  p = Number(p);

  if (p === 0) return "";
  if (p > 0 && p < 1) return "background:#d0e7ff;";
  if (p >= 1 && p < 5) return "background:#7fbfff;";
  if (p >= 5 && p < 20) return "background:#005bff; color:white;";
  if (p >= 20) return "background:#8000ff; color:white;";

  return "";
}

/* --- 風速に応じた色（分割前仕様を完全再現） --- */
export function windColor(speed) {
  speed = Number(speed);

  if (speed < 1) return "#999999";      // 無風〜微風
  if (speed >= 1 && speed < 4) return "#4da3ff";
  if (speed >= 4 && speed < 7) return "#3cb371";
  if (speed >= 7 && speed < 10) return "#ffa500";
  if (speed >= 10 && speed < 20) return "#ff4500";
  if (speed >= 20) return "#8000ff";

  return "#4da3ff";
}

/* --- 鋭角 SVG 風向矢印（分割前仕様を完全再現） --- */
export function windArrowSvg(deg, speed) {
  if (deg === null || deg === undefined) return "？";

  const down = (deg + 180) % 360;
  const color = windColor(speed);

  return `
    <div style="
      width:22px;
      height:22px;
      display:flex;
      align-items:center;
      justify-content:center;
      transform: rotate(${down}deg);
    ">
      <svg width="22" height="22" viewBox="0 0 100 100">
        <polygon points="50,5 70,95 30,95" fill="${color}"/>
      </svg>
    </div>
  `;
}

/* --- 項目名と単位を2行に分ける（分割前仕様を完全再現） --- */
export function splitLabel(label) {
  const match = label.match(/^(.+?)\((.+?)\)$/);
  if (!match) return label;
  const name = match[1];
  const unit = match[2];
  return `${name}<br><span style="font-size:12px; color:#555;">(${unit})</span>`;
}