// Initialize map
let issMap = L.map('map-container', {
    maxBounds: [[-90, -180], [90, 180]],
    maxBoundsViscosity: 1,
    worldCopyJump: true
}).setView([30, 0], 1.5);

// Add fullscreen control
issMap.addControl(new L.Control.Fullscreen({
    title: {
        'false': 'View FullScreen',
        'true': 'Exit FullScreen'
    }
}));

// Add tile layer
L.tileLayer('https://api.maptiler.com/maps/outdoor/{z}/{x}/{y}.png?key=I5jJIO0gVFZgkPhGgi1t', {
    attribution: '&copy; MapTiler &copy; OpenStreetMap contributors &copy; Jörg Dietrich &copy; WTIA REST API</a>'
}).addTo(issMap);

// Add terminator
L.terminator().addTo(issMap);

// Add scale control
L.control.scale({
    maxWidth: 100,
    metric: true
}).addTo(issMap);

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
    try {
        const response = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
        const data = await response.json();

        const { latitude, longitude, velocity, altitude, solar_lat, solar_lon, visibility } = data;

        marker.setLatLng([latitude, longitude]);
        circle.setLatLng([latitude, longitude]);

        if (solar_lon > 180) {
            sun.setLatLng([solar_lat, solar_lon - 360]);
        } else {
            sun.setLatLng([solar_lat, solar_lon]);
        }

        if (firstCall) {
            issMap.setView([latitude, longitude], 3);
            firstCall = false;
        }

        // Update HTML elements
        document.getElementById("lat-data").innerText = `${latitude.toFixed(2)}° ${latitude > 0 ? 'N' : 'S'}`;
        document.getElementById("long-data").innerText = `${longitude.toFixed(2)}° ${longitude > 0 ? 'E' : 'W'}`;
        document.getElementById("velocity").innerText = (velocity / 3600).toFixed(2);
        document.getElementById("altitude").innerText = altitude.toFixed(2);
        document.getElementById("visibility").innerText = visibility;

    } catch (error) {
        console.error("Error fetching ISS data:", error);
    }
};

setInterval(getIssLocation, 1000);

// ... (rest of your code for centreMap, issInfo remains the same)
