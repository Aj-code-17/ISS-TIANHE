// 1. Create the 3D Globe
const globe = new WorldWind.WorldWindow("globe");
globe.addLayer(new WorldWind.BMNGLayer()); // Earth texture

// 2. Create the 2D Map
const map = L.map('map').setView([0, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// 3. Add Sunlight/Shadow
function updateSun() {
  const now = new Date();
  const sunPos = SunCalc.getPosition(now, 0, 0);
  
  // Dark overlay for night
  const nightLayer = new WorldWind.SurfaceCircle(
    new WorldWind.Location(0, 0), 
    WorldWind.Location.greatCircleDistance(new WorldWind.Location(0, 0), 90)
  );
  nightLayer.attributes = new WorldWind.ShapeAttributes();
  nightLayer.attributes.interiorColor = new WorldWind.Color(0, 0, 0, 0.6);
  globe.addLayer(nightLayer);
}
updateSun();

// 4. Track ISS
async function fetchISS() {
  const response = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
  const data = await response.json();
  return { lat: data.latitude, lon: data.longitude };
}

setInterval(async () => {
  const issPos = await fetchISS();
  // Add ISS marker
  const issPlacemark = new WorldWind.Placemark(
    new WorldWind.Position(issPos.lat, issPos.lon, 400000)
  );
  globe.addLayer(new WorldWind.RenderableLayer([issPlacemark]));
}, 5000);
