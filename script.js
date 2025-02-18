const globe = new WorldWind.WorldWindow("globe");
globe.addLayer(new WorldWind.BMNGLayer()); // Base layer
globe.addLayer(new WorldWind.CompassLayer()); // Add compass

// Initialize 2D Map
const map = L.map('map').setView([0, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
async function fetchISS() {
  const proxy = "https://corsproxy.io/?";
  const response = await fetch(proxy + 'https://api.wheretheiss.at/v1/satellites/25544');
  const data = await response.json();
  return { lat: data.latitude, lon: data.longitude };
}
async function fetchTiangong() {
  const response = await fetch('https://celestrak.org/NORAD/elements/gp.php?NAME=TIANHE&FORMAT=json');
  const data = await response.json();
  // Parse TLE data here (example simplified)
  return { lat: data[0].MEAN_MOTION, lon: data[0].RA_OF_ASC_NODE };
}
let issLayer = new WorldWind.RenderableLayer("ISS");

function updateISSPosition(lat, lon) {
  issLayer.removeAllRenderables(); // Clear previous markers
  const issPlacemark = new WorldWind.Placemark(
    new WorldWind.Position(lat, lon, 400000),
    false,
    new WorldWind.PlacemarkAttributes({ imageSource: "iss-icon.png" })
  );
  issLayer.addRenderable(issPlacemark);
  globe.addLayer(issLayer);
}
let pathPositions = [];
function updatePath(lat, lon) {
  pathPositions.push(new WorldWind.Position(lat, lon, 400000));
  const path = new WorldWind.SurfacePolyline(pathPositions, 3);
  path.attributes.outlineColor = WorldWind.Color.RED;
  issLayer.addRenderable(path);
}
// Leaflet setup for ISS
const issIcon = L.icon({ iconUrl: 'iss-icon.png', iconSize: [30, 30] });
let issMarker = L.marker([0, 0], { icon: issIcon }).addTo(map);
let path = L.polyline([], { color: 'red' }).addTo(map);

// Update both globe and map
setInterval(async () => {
  const issPos = await fetchISS();
  updateISSPosition(issPos.lat, issPos.lon);
  issMarker.setLatLng([issPos.lat, issPos.lon]);
  path.addLatLng([issPos.lat, issPos.lon]);
}, 5000);
// Test ISS marker (fixed position)
const issPlacemark = new WorldWind.Placemark(
  new WorldWind.Position(0, 0, 400000),
  false,
  new WorldWind.PlacemarkAttributes({
    imageSource: "https://img.icons8.com/color/48/iss.png",
    imageScale: 0.5
  })
);
globe.addLayer(new WorldWind.RenderableLayer([issPlacemark]));
