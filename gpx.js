export function generateGPX(trackCoords) {
  let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="KayakApp" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>Track Log</name>
    <trkseg>
`;

  trackCoords.forEach(([lat, lng]) => {
    gpx += `      <trkpt lat="${lat}" lon="${lng}"></trkpt>\n`;
  });

  gpx += `    </trkseg>
  </trk>
</gpx>`;

  return gpx;
}