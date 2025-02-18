// ----- WORLDWIND SETUP -----
// Create a WorldWind globe in the element with id="globe"
const globe = new WorldWind.WorldWindow("globe");
globe.addLayer(new WorldWind.BMNGLayer());
globe.addLayer(new WorldWind.CompassLayer());

// Create separate WorldWind layers for the ISS marker and its path
const issMarkerLayer = new WorldWind.RenderableLayer("ISS Marker");
const issPathLayer = new WorldWind.RenderableLayer("ISS Path");
globe.addLayer(issMarkerLayer);
globe.addLayer(issPathLayer);

// Array to store path positions for WorldWind
let worldwindPathPositions = [];

// ----- LEAFLET SETUP -----
// Initialize the Leaflet map in the element with id="map"
const map = L.map('map').setView([0, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// Use an online URL for the ISS icon so no local PNG is needed
const issIconUrl = "https://img.icons8.com/color/48/iss.png";

// Create a Leaflet marker and polyline for the ISS
const issIcon = L.icon({ iconUrl: issIconUrl, iconSize: [30, 30] });
let leafletMarker = L.marker([0, 0], { icon: issIcon }).addTo(map);
let leafletPathCoordinates = [];
let leafletPolyline = L.polyline([], { color: 'red' }).addTo(map);

// ----- DATA FETCHING & UPDATES -----
// Function to fetch ISS data using a CORS proxy
async function fetchISS() {
    const proxy = "https://thingproxy.freeboard.io/fetch/";
    try {
        const response = await fetch(proxy + 'https://api.wheretheiss.at/v1/satellites/25544');
        const data = await response.json();
        console.log("Fetched ISS data:", data);
        return { lat: data.latitude, lon: data.longitude };
    } catch (error) {
        console.error("Error fetching ISS data:", error);
        return null;
    }
}

// Update WorldWind: remove previous marker, add new placemark, and update path
function updateWorldWind(issPos) {
    // Remove any existing ISS marker
    issMarkerLayer.removeAllRenderables();
    
    // Create a new placemark for the ISS
    const placemark = new WorldWind.Placemark(
        new WorldWind.Position(issPos.lat, issPos.lon, 400000), // altitude in meters
        false,
        new WorldWind.PlacemarkAttributes({ imageSource: issIconUrl, imageScale: 0.5 })
    );
    issMarkerLayer.addRenderable(placemark);
    
    // Append the new position to the path array
    worldwindPathPositions.push(new WorldWind.Position(issPos.lat, issPos.lon, 400000));
    
    // Update the path layer
    issPathLayer.removeAllRenderables();
    if (worldwindPathPositions.length > 1) {
        const polyline = new WorldWind.SurfacePolyline(worldwindPathPositions, new WorldWind.PolylineAttributes());
        polyline.attributes.outlineColor = WorldWind.Color.RED;
        polyline.attributes.outlineWidth = 2;
        issPathLayer.addRenderable(polyline);
    }
}

// Update Leaflet: move the marker and update the path polyline
function updateLeaflet(issPos) {
    leafletMarker.setLatLng([issPos.lat, issPos.lon]);
    leafletPathCoordinates.push([issPos.lat, issPos.lon]);
    leafletPolyline.setLatLngs(leafletPathCoordinates);
}

// Main update loop: fetch and update every 5 seconds
setInterval(async () => {
    const issPos = await fetchISS();
    if (issPos) {
        updateWorldWind(issPos);
        updateLeaflet(issPos);
        console.log("Updated ISS position:", issPos);
    }
}, 5000);

