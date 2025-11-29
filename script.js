// Include Satellite.js library
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/satellite.js@4.0.0/dist/satellite.min.js';
document.head.appendChild(script);

// Initialize map
// Note: Ensure you have the CSS and Leaflet JS loaded in your HTML <head>
let issMap = L.map('map-container', {
    maxBounds: [[-90, -180], [90, 180]],
    maxBoundsViscosity: 1,
    worldCopyJump: true
}).setView([30, 0], 1.5);

// Add a Tile Layer (REQUIRED for the map to show up)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(issMap);

// Create ISS icon
let issIcon = L.icon({
    iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/International_Space_Station_%28Expedition_58_Patch%29.svg/500px-International_Space_Station_%28Expedition_58_Patch%29.svg.png',
    iconSize: [70, 50]
});

// Create ISS marker
let marker = L.marker([0, 0], { icon: issIcon, title: 'ISS Position', alt: 'ISS icon' }).addTo(issMap);

// Tiangong Icon and Marker
const tiangongIcon = L.icon({
    iconUrl: 'tiangong.png', // Ensure this image exists in your folder
    iconSize: [50, 50]
});
const tiangongMarker = L.marker([0, 0], { icon: tiangongIcon, title: 'Tiangong' }).addTo(issMap);
let tiangongPath = [];
const tiangongPolyline = L.polyline([], { color: 'blue' }).addTo(issMap);


// --- TLE Data (User Provided - NOT CHANGED) ---
const TLE = {
    TIANGONG: {
        line1: '1 48274U 21035A   25333.06763102  .00014333  00000-0  18674-3 0  9990',
        line2: '2 48274  41.4664  99.6574 0010668 290.8853  69.0842 15.58380651261895'
    }
};

// --- TLE UTILITY FUNCTIONS ---

// Function to get current position from TLE
function getTiangongPosition(tleLine1, tleLine2, date) {
    const satrec = satellite.twoline2satrec(tleLine1, tleLine2);
    const positionAndVelocity = satellite.propagate(satrec, date);

    if (!positionAndVelocity.position) return null;

    const positionGd = satellite.eciToGeodetic(positionAndVelocity.position, satellite.gstime(date));

    // Convert radians to degrees
    const longitude = satellite.degreesLong(positionGd.longitude);
    const latitude = satellite.degreesLat(positionGd.latitude);

    return [latitude, longitude]; // Leaflet uses [lat, lng]
}

// 💥 FIX: Refined Antimeridian Handling for Leaflet Marker 💥
function handleLeafletAntimeridian(marker, newLatLng) {
    const currentLatLng = marker.getLatLng();
    const [newLat, newLng] = newLatLng;

    // The threshold for detecting a jump is typically 180 degrees
    if (Math.abs(newLng - currentLatLng.lng) > 180) {
        // Step 1: Immediately hide the marker icon element
        const iconElement = marker.getElement();
        if (iconElement) {
            iconElement.style.opacity = '0';
        }

        // Step 2: Set the position to the new coordinates
        marker.setLatLng(newLatLng);

        // Step 3: Instantly show the marker again in the new position
        // This makes the marker 'teleport' without drawing a connecting line.
        if (iconElement) {
            iconElement.style.opacity = '1';
        }
    } else {
        // Normal movement
        marker.setLatLng(newLatLng);
    }
}


// --- ISS Function (Keeping simple API approach) ---
const getIssLocation = async () => {
    try {
        const resp = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
        const d = await resp.json();
        // Update the primary marker (assuming 'marker' is the ISS marker)
        handleLeafletAntimeridian(marker, [d.latitude, d.longitude]);
        
    } catch (e) {
        console.error('ISS fetch error', e);
    }
};
setInterval(getIssLocation, 5000);


// --- Tiangong Functions (FIXED to use TLE) ---

function updateTiangongPosition() {
    const now = new Date();
    const newLatLng = getTiangongPosition(TLE.TIANGONG.line1, TLE.TIANGONG.line2, now);

    if (newLatLng) {
        const currentLng = tiangongMarker.getLatLng().lng;
        const newLng = newLatLng[1];

        // 1. FIX: Use the Antimeridian handler for the marker
        handleLeafletAntimeridian(tiangongMarker, newLatLng);

        // 2. Path Line Logic: Only push coordinates if no jump occurs, otherwise start a new path segment.
        if (tiangongPath.length === 0 || Math.abs(newLng - currentLng) < 180) {
            tiangongPath.push(newLatLng);
        } else {
            // If it crosses the antimeridian, clear the path and start a new one
            tiangongPath = [newLatLng];
        }

        tiangongPolyline.setLatLngs(tiangongPath);
    }
}

// Initial Calls
script.onload = () => { // Wait for Satellite.js to load
    updateTiangongPosition();
    setInterval(updateTiangongPosition, 1000); // Update every 1 second for smoothness
};
