// Include Satellite.js library
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/satellite.js@4.0.0/dist/satellite.min.js';
document.head.appendChild(script);

// --- 💥 CRITICAL FIX: Custom Leaflet Marker Type 💥 ---
// Define a custom marker that overrides the internal coordinate handling.
// This prevents the line drawing when Leaflet's worldCopyJump fails for markers.
L.NonWrappingMarker = L.Marker.extend({
    // Override the coordinate transformation to use the "closest" longitude copy.
    _setLatLng: function (latlng) {
        // Get the map's current view center
        const mapCenterLng = this._map.getCenter().lng;
        
        // Calculate the closest longitude copy to the center of the map.
        // This is necessary because Leaflet projects all copies.
        let lng = latlng.lng;
        while (lng > mapCenterLng + 180) {
            lng -= 360;
        }
        while (lng < mapCenterLng - 180) {
            lng += 360;
        }

        // Use the corrected longitude for the marker's internal position
        this._latlng = L.latLng(latlng.lat, lng);

        // Standard Leaflet update logic follows
        if (this._icon) {
            this._reset();
        }
    }
});

// Define a factory function for easy creation
L.nonWrappingMarker = function (latlng, options) {
    return new L.NonWrappingMarker(latlng, options);
};
// --- END CUSTOM MARKER ---


// Initialize map
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

// 🔄 Change: Use the new custom marker type L.nonWrappingMarker
let marker = L.nonWrappingMarker([0, 0], { icon: issIcon, title: 'ISS Position', alt: 'ISS icon' }).addTo(issMap);

// Tiangong Icon and Marker
const tiangongIcon = L.icon({
    iconUrl: 'tiangong.png',
    iconSize: [50, 50]
});
// 🔄 Change: Use the new custom marker type L.nonWrappingMarker
const tiangongMarker = L.nonWrappingMarker([0, 0], { icon: tiangongIcon, title: 'Tiangong' }).addTo(issMap);
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

function getTiangongPosition(tleLine1, tleLine2, date) {
    const satrec = satellite.twoline2satrec(tleLine1, tleLine2);
    const positionAndVelocity = satellite.propagate(satrec, date);

    if (!positionAndVelocity.position) return null;

    const positionGd = satellite.eciToGeodetic(positionAndVelocity.position, satellite.gstime(date));

    const longitude = satellite.degreesLong(positionGd.longitude);
    const latitude = satellite.degreesLat(positionGd.latitude);

    return [latitude, longitude]; // Leaflet uses [lat, lng]
}

// --- ISS Function (Keeping simple API approach) ---
const getIssLocation = async () => {
    try {
        const resp = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
        const d = await resp.json();
        
        // 🔄 Change: Directly use setLatLng now that the marker itself handles the wrapping
        marker.setLatLng([d.latitude, d.longitude]); 
        
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

        // 1. 🔄 Change: Directly use setLatLng now that the marker itself handles the wrapping
        tiangongMarker.setLatLng(newLatLng);

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
