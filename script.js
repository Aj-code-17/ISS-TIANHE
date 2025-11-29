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
// We will use the TLE data from your last MapLibre attempt as it is the latest
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

// FIX: Antimeridian Handling for Leaflet Marker
// Leaflet's worldCopyJump attempts to fix the visual, but the marker needs help.
function handleLeafletAntimeridian(marker, newLatLng) {
    const currentLatLng = marker.getLatLng();
    const [newLat, newLng] = newLatLng;

    // Check if the jump is over 180 degrees
    if (Math.abs(newLng - currentLatLng.lng) > 180) {
        // Option 1: Teleport marker to the opposite map copy before setting final position.
        // This is a common Leaflet hack to prevent the jump line.
        let correctedLng = newLng > 0 ? newLng - 360 : newLng + 360;
        
        // Move the marker to the "off-screen" copy
        marker.setLatLng([newLat, correctedLng]);

        // Then move it back to the current copy's coordinates (the original newLng)
        // Leaflet will handle the visual transition smoothly from the off-screen copy.
        setTimeout(() => marker.setLatLng(newLatLng), 10); 
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
        
        // Update ISS path here if needed...
        
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
        // FIX: Use the Antimeridian handler
        handleLeafletAntimeridian(tiangongMarker, newLatLng);

        // Update Path Line (Only if the jump is not happening, to prevent path crossing)
        const currentLng = tiangongMarker.getLatLng().lng;
        const newLng = newLatLng[1];
        
        // Only push if the jump is less than 180 degrees (i.e., not crossing the Antimeridian)
        if (tiangongPath.length === 0 || Math.abs(newLng - currentLng) < 180) {
            tiangongPath.push(newLatLng);
        } else {
            // If it crosses the antimeridian, start a new path segment conceptually
            // In Leaflet, this is done by resetting the path or starting a new polyline.
            // For simplicity and quick fix, we just clear the path and start fresh.
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


// The original code below is fully removed:
/*
async function fetchTiangongPosition() {
    // ... N2YO API logic
}
fetchTiangongPosition(); 
setInterval(fetchTiangongPosition, 5000);
*/
