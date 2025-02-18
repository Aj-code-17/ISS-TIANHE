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
