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

// Tiangong TLE data
const tle1 = "1 54216U 22143A   25048.94388909  .00037270  00000-0  45292-3 0  9993";
const tle2 = "2 54216  41.4672  26.6806 0005254 200.9588 159.1035 15.59818964130880";

// Function to update Tiangong's location
function updateTiangongLocation() {
    if (typeof satellite === 'undefined') {
        setTimeout(updateTiangongLocation, 100);
        return;
    }

    const satrec = satellite.twoline2satrec(tle1, tle2);
    const position = satellite.propagate(satrec, new Date());

    if (position.position) {
        const longitude = satellite.degreesLong(position.longitude);
        const latitude = satellite.degreesLat(position.latitude);
        tiangongMarker.setLatLng([latitude, longitude]);
        tiangongPath.push([latitude, longitude]);
        tiangongPolyline.setLatLngs(tiangongPath);
    } else {
        console.error("Error calculating Tiangong's position:", position);
    }
}

updateTiangongLocation();
setInterval(updateTiangongLocation, 5000);

// ... (rest of your code for centreMap, issInfo remains the same)
