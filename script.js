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

// --- ISS Function (Placeholder based on your code) ---
const getIssLocation = async () => {
    // You can implement the ISS fetch here similarly to Tiangong
    // or keep your existing logic.
};
setInterval(getIssLocation, 5000);


// --- Tiangong Functions (FIXED) ---
async function fetchTiangongPosition() {
    // Your API Key
    const apiKey = 'XHJLTW-DZYG28-2SYAU8-5M1X'; 
    const noradId = 48274; // Tiangong
    const observerLat = 0;
    const observerLng = 0;
    const observerAlt = 0;
    const seconds = 1;

    // FIX 1: Added a Proxy (corsproxy.io) to bypass browser security blocks
    const proxyUrl = 'https://corsproxy.io/?'; 
    
    // FIX 2: Fixed URL syntax (changed /&apiKey to /?apiKey) and encoded the URI
    const targetUrl = `https://api.n2yo.com/rest/v1/satellite/positions/${noradId}/${observerLat}/${observerLng}/${observerAlt}/${seconds}/?apiKey=${apiKey}`;
    const url = proxyUrl + encodeURIComponent(targetUrl);

    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        // Check if positions exist in response
        if (data && data.positions && data.positions.length > 0) {
            const position = data.positions[0];
            const latitude = parseFloat(position.satlatitude);
            const longitude = parseFloat(position.satlongitude);

            // Update Marker
            tiangongMarker.setLatLng([latitude, longitude]);
            
            // Update Path Line
            tiangongPath.push([latitude, longitude]);
            tiangongPolyline.setLatLngs(tiangongPath);
            
            console.log("Tiangong updated:", latitude, longitude);
        }

    } catch (error) {
        console.error('Error fetching Tiangong position:', error);
    }
}

// Initial Calls
fetchTiangongPosition(); 
setInterval(fetchTiangongPosition, 5000); // Update every 5 seconds
