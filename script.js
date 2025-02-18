const globe = new WorldWind.WorldWindow("globe");
globe.addLayer(new WorldWind.BMNGLayer()); // Base layer
globe.addLayer(new WorldWind.CompassLayer()); // Add compass

// Initialize 2D Map
const map = L.map('map').setView([0, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

async function fetchISS() {
  const proxy = "https://corsproxy.io/?";
  try {
    const response = await fetch(proxy + 'https://api.wheretheiss.at/v1/satellites/25544');
    const data = await response.json();
    return { lat: data.latitude, lon: data.longitude };
  } catch (error) {
    console.error("Error fetching ISS data:", error);
    return null;
  }
}

async function fetchTiangong() {
  try {
    const response = await fetch('https://celestrak.org/NORAD/elements/gp.php?NAME=TIANHE&FORMAT=json');
    const data = await response.json();
    
    if (!data || data.length === 0) {
      console.error("Error: No Tiangong data received.");
      return null;
    }
    
    // Convert TLE data to Lat/Lon using satellite.js
    const tleLine1 = data[0].TLE_LINE1;
    const tleLine2 = data[0].TLE_LINE2;
    const satrec = satellite.twoline2satrec(tleLine1, tleLine2);
    const now = new Date();
    const positionAndVelocity = satellite.propagate(satrec, now);
    
    if (!positionAndVelocity.position) {
      console.error("Error: Could not calculate position for Tiangong.");
      return null;
    }
    
    const gmst = satellite.gstime(now);
    const geodeticCoords = satellite.eciToGeodetic(positionAndVelocity.position, gmst);
    
    return {
      lat: satellite.degreesLat(geodeticCoords.latitude),
      lon: satellite.degreesLong(geodeticCoords.longitude)
    };
  } catch (error) {
    console.error("Error fetching Tiangong data:", error);
    return null;
  }
}

// WorldWind ISS Layer Setup
let issLayer = new WorldWind.RenderableLayer("ISS");
globe.addLayer(issLayer);

function updateISSPosition(lat, lon) {
  issLayer.removeAllRenderables(); // Clear previous markers
  const issPlacemark = new WorldWind.Placemark(
    new WorldWind.Position(lat, lon, 400000),
    false,
    new WorldWind.PlacemarkAttributes({ imageSource: "iss-icon.png" })
  );
  issLayer.addRenderable(issPlacemark);
}

let pathPositions = [];
function updatePath(lat, lon) {
  pathPositions.push(new WorldWind.Position(lat, lon, 400000));
  const path = new WorldWind.SurfacePolyline(pathPositions, 3);
  path.attributes.outlineColor = WorldWind.Color.RED;
  issLayer.addRenderable(path);
}

// Leaflet Setup for ISS
const issIcon = L.icon({ iconUrl: 'iss-icon.png', iconSize: [30, 30] });
let issMarker = L.marker([0, 0], { icon: issIcon }).addTo(map);
let path = L.polyline([], { color: 'red' }).addTo(map);

// Update ISS & Tiangong Position Every 5 Seconds
setInterval(async () => {
  const issPos = await fetchISS();
  if (issPos) {
    updateISSPosition(issPos.lat, issPos.lon);
    issMarker.setLatLng([issPos.lat, issPos.lon]);
    path.setLatLngs([...path.getLatLngs(), [issPos.lat, issPos.lon]]);
  }

  const tiangongPos = await fetchTiangong();
  if (tiangongPos) {
    console.log("Tiangong Position:", tiangongPos.lat, tiangongPos.lon);
  }
}, 5000);

// Initial Test ISS Marker
const issPlacemark = new WorldWind.Placemark(
  new WorldWind.Position(0, 0, 400000),
  false,
  new WorldWind.PlacemarkAttributes({
    imageSource: "https://img.icons8.com/color/48/iss.png",
    imageScale: 0.5
  })
);
issLayer.addRenderable(issPlacemark);

