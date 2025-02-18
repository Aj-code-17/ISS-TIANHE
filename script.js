// Setup WorldWind Globe and Layers
const globe = new WorldWind.WorldWindow("globe");
globe.addLayer(new WorldWind.BMNGLayer());
globe.addLayer(new WorldWind.CompassLayer());

// Create separate layers for each satellite’s marker and path
const issLayer = new WorldWind.RenderableLayer("ISS");
const tiangongLayer = new WorldWind.RenderableLayer("Tiangong");
const issPathLayer = new WorldWind.RenderableLayer("ISS Path");
const tiangongPathLayer = new WorldWind.RenderableLayer("Tiangong Path");

globe.addLayer(issLayer);
globe.addLayer(tiangongLayer);
globe.addLayer(issPathLayer);
globe.addLayer(tiangongPathLayer);

// Initialize Leaflet Map
const map = L.map('map').setView([0, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// Arrays to store path coordinates for WorldWind and Leaflet
let issGlobePathPositions = [];
let tiangongGlobePathPositions = [];
let issLeafletPath = [];
let tiangongLeafletPath = [];

// Use online URLs for the icons
const issIconUrl = "https://img.icons8.com/color/48/iss.png";
const tiangongIconUrl = "https://via.placeholder.com/48.png?text=Tiangong";

// Create Leaflet markers and polylines for each satellite
const issIcon = L.icon({ iconUrl: issIconUrl, iconSize: [30, 30] });
const tiangongIcon = L.icon({ iconUrl: tiangongIconUrl, iconSize: [30, 30] });

let issMarker = L.marker([0, 0], { icon: issIcon }).addTo(map);
let tiangongMarker = L.marker([0, 0], { icon: tiangongIcon }).addTo(map);
let issPolyline = L.polyline([], { color: 'red' }).addTo(map);
let tiangongPolyline = L.polyline([], { color: 'blue' }).addTo(map);

// Function to fetch ISS data
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

// Function to fetch Tiangong data using TLE and satellite.js
async function fetchTiangong() {
  try {
    const response = await fetch('https://celestrak.org/NORAD/elements/gp.php?NAME=TIANHE&FORMAT=json');
    const data = await response.json();
    if (!data || data.length === 0 || !data[0].TLE_LINE1 || !data[0].TLE_LINE2) {
      console.error("Error: Invalid Tiangong TLE data.");
      return null;
    }
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

// Update the placemark for a satellite on WorldWind
function updatePlacemark(layer, lat, lon, iconUrl) {
  // Clear only the placemark (not the path layer)
  layer.removeAllRenderables();
  const placemark = new WorldWind.Placemark(
    new WorldWind.Position(lat, lon, 400000),
    false,
    new WorldWind.PlacemarkAttributes({ imageSource: iconUrl })
  );
  layer.addRenderable(placemark);
}

// Update the path for a satellite on WorldWind
function updateGlobePath(pathLayer, pathPositions, lat, lon, color) {
  pathPositions.push(new WorldWind.Position(lat, lon, 400000));
  pathLayer.removeAllRenderables();
  const polyline = new WorldWind.SurfacePolyline(pathPositions, new WorldWind.PolylineAttributes());
  polyline.attributes.outlineColor = color;
  polyline.attributes.outlineWidth = 2;
  pathLayer.addRenderable(polyline);
}

// Update Leaflet marker and path for a satellite
function updateLeaflet(marker, polyline, leafletPath, lat, lon) {
  marker.setLatLng([lat, lon]);
  leafletPath.push([lat, lon]);
  polyline.setLatLngs(leafletPath);
}

// Main update loop (every 5 seconds)
setInterval(async () => {
  // Update ISS data and visuals
  const issPos = await fetchISS();
  if (issPos) {
    updatePlacemark(issLayer, issPos.lat, issPos.lon, issIconUrl);
    updateGlobePath(issPathLayer, issGlobePathPositions, issPos.lat, issPos.lon, WorldWind.Color.RED);
    updateLeaflet(issMarker, issPolyline, issLeafletPath, issPos.lat, issPos.lon);
  }
  
  // Update Tiangong data and visuals
  const tiangongPos = await fetchTiangong();
  if (tiangongPos) {
    updatePlacemark(tiangongLayer, tiangongPos.lat, tiangongPos.lon, tiangongIconUrl);
    updateGlobePath(tiangongPathLayer, tiangongGlobePathPositions, tiangongPos.lat, tiangongPos.lon, WorldWind.Color.BLUE);
    updateLeaflet(tiangongMarker, tiangongPolyline, tiangongLeafletPath, tiangongPos.lat, tiangongPos.lon);
  }
}, 5000);

