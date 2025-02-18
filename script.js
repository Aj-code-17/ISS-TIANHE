// Include Satellite.js library
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/satellite.js@4.0.0/dist/satellite.min.js';
document.head.appendChild(script);

// Initialize map
let issMap = L.map('map-container', {
    maxBounds: [[-90, -180], [90, 180]],
    maxBoundsViscosity: 1,
    worldCopyJump: true
}).setView([30, 0], 1.5);

// ... (rest of your map initialization code)

// Create ISS icon
let issIcon = L.icon({
    iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/International_Space_Station_%28Expedition_58_Patch%29.svg/500px-International_Space_Station_%28Expedition_58_Patch%29.svg.png',
    iconSize: [70, 50]
});

// Create ISS marker
let marker = L.marker([0, 0], { icon: issIcon, title: 'ISS Position', alt: 'ISS icon' }).addTo(issMap);

// ... (rest of your code for circle, sun, issInfo remains the same)

let firstCall = true;

const getIssLocation = async () => {
    // ... (your existing ISS location code)
};

setInterval(getIssLocation, 1000);


// Tiangong Icon and Marker
const tiangongIcon = L.icon({
    iconUrl: 'tiangong.png', // Replace with your Tiangong icon
    iconSize: [50, 50]
});
const tiangongMarker = L.marker([0, 0], { icon: tiangongIcon, title: 'Tiangong' }).addTo(issMap);
let tiangongPath = [];
const tiangongPolyline = L.polyline([], { color: 'blue' }).addTo(issMap);



// Tiangong Functions (using N2YO API)
async function fetchTiangongPosition() {
    const apiKey = '53LGUU-BLJ9LG-MJLP5Y-5F62'; // Replace with your N2YO.com API key
    const noradId = 48274; // NORAD ID for Tiangong
    const observerLat = 0; // Your latitude
    const observerLng = 0; // Your longitude
    const observerAlt = 0; // Your altitude in meters
    const seconds = 1; // Number of seconds for prediction

    const url = `https://api.n2yo.com/rest/v1/satellite/positions/${noradId}/${observerLat}/${observerLng}/${observerAlt}/${seconds}/&apiKey=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        const position = data.positions[0];
        const latitude = position.satlatitude;
        const longitude = position.satlongitude;

        tiangongMarker.setLatLng([latitude, longitude]);
        tiangongPath.push([latitude, longitude]);
        tiangongPolyline.setLatLngs(tiangongPath);

    } catch (error) {
        console.error('Error fetching Tiangong position:', error);
    }
}


// Initial Calls and Intervals
updateISSLocation(); // If you have this function for ISS
setInterval(updateISSLocation, 5000); // If you have this interval for ISS

fetchTiangongPosition(); // Call the N2YO API function
setInterval(fetchTiangongPosition, 5000); // Update every 5 seconds

// ... (rest of your code for centreMap, issInfo remains the same)
