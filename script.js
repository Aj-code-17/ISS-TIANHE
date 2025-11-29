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
// Use the new custom marker type L.nonWrappingMarker for ISS
let marker = L.nonWrappingMarker([0, 0], { icon: issIcon, title: 'ISS Position', alt: 'ISS icon' }).addTo(issMap);
// Tiangong Icon and Marker
const tiangongIcon = L.icon({
    iconUrl: 'tiangong.png',
    iconSize: [50, 50]
});
// Use the new custom marker type L.nonWrappingMarker for Tiangong
const tiangongMarker = L.nonWrappingMarker([0, 0], { icon: tiangongIcon, title: 'Tiangong' }).addTo(issMap);
let tiangongPath = [];
// 💡 FINAL FIX APPLIED HERE: The polyline options define a SOLID line by explicitly setting dashArray: null
const tiangongPolyline = L.polyline([], {
    color: 'blue',
    weight: 3,
    opacity: 0.8,
    dashArray: null // <--- Forces the line to be continuous and solid
}).addTo(issMap);
// --- TLE Data (Updated to latest from CelesTrak as of 2025-11-29) ---
const TLE = {
    TIANGONG: {
        line1: '1 48274U 21035A   25333.06763102  .00014333  00000+0  18674-3 0  9999',
        line2: '2 48274  41.4664  99.6574 0010668 290.8853  69.0842 15.58380651261895'
    }
};
// Get user's location for distance calculation, marking on map, and display (with permission)
let userLat, userLon, userCity = 'N/A';
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(async pos => {
    userLat = pos.coords.latitude;
    userLon = pos.coords.longitude;
    // Reverse geocode to get city name
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLat}&lon=${userLon}&zoom=10&addressdetails=1`);
      const data = await response.json();
      userCity = data.address.city || data.address.town || data.address.village || 'Unknown Location';
    } catch (e) {
      console.error('Reverse geocode error', e);
      userCity = 'Unknown Location';
    }
    // Update user location displays (assuming HTML has the spans)
    if (document.getElementById('user-location-iss')) document.getElementById('user-location-iss').innerText = userCity;
    if (document.getElementById('user-location-tg')) document.getElementById('user-location-tg').innerText = userCity;
    // Add user marker with city name above it, styled as a standard map pin
    const userIcon = L.divIcon({
      html: `<div style="text-align:center; background:white; color:black; padding:2px; border-radius:3px; white-space:nowrap; margin-bottom:-10px;">${userCity}</div>
             <img src="https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png" style="width:25px; height:41px; transform:translate(-50%, -100%);">`,
      className: '',
      iconSize: [25, 41],
      iconAnchor: [12.5, 41]
    });
    L.marker([userLat, userLon], {icon: userIcon}).addTo(issMap);
  }, err => {
    console.error('Geolocation error', err);
    // Update displays to N/A if denied
    if (document.getElementById('user-location-iss')) document.getElementById('user-location-iss').innerText = userCity;
    if (document.getElementById('user-location-tg')) document.getElementById('user-location-tg').innerText = userCity;
  });
}
// Haversine formula for distance
const degToRad = deg => deg * Math.PI / 180;
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = degToRad(lat2 - lat1);
  const dLon = degToRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(degToRad(lat1)) * Math.cos(degToRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
// --- TLE UTILITY FUNCTIONS ---
function getTiangongPosition(tleLine1, tleLine2, date) {
    const satrec = satellite.twoline2satrec(tleLine1, tleLine2);
    const positionAndVelocity = satellite.propagate(satrec, date);
    if (!positionAndVelocity.position) return null;
    const positionGd = satellite.eciToGeodetic(positionAndVelocity.position, satellite.gstime(date));
    const longitude = satellite.degreesLong(positionGd.longitude);
    const latitude = satellite.degreesLat(positionGd.latitude);
    const altitude = positionGd.height;
    const velocity_km_s = Math.sqrt(positionAndVelocity.velocity.x ** 2 + positionAndVelocity.velocity.y ** 2 + positionAndVelocity.velocity.z ** 2);
    const velocity = velocity_km_s * 3600;
    return { lat: latitude, lng: longitude, altitude, velocity, timestamp: date.getTime() / 1000 };
}
// --- ISS Function (API Update) ---
const getIssLocation = async () => {
    try {
        const resp = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
        const d = await resp.json();
       
        // Use L.latLng object
        marker.setLatLng(L.latLng(d.latitude, d.longitude));
       
    } catch (e) {
        console.error('ISS fetch error', e);
    }
};
setInterval(getIssLocation, 5000);
// --- Tiangong Functions (TLE Update and Path Logic) ---
function updateTiangongPosition() {
    const now = new Date();
    const newLatLng = getTiangongPosition(TLE.TIANGONG.line1, TLE.TIANGONG.line2, now);
    if (newLatLng) {
        const currentLng = tiangongMarker.getLatLng().lng;
        const newLng = newLatLng.lng;
       
        // 1. Update Marker: The NonWrappingMarker handles the visual teleportation.
        tiangongMarker.setLatLng(newLatLng);
        // 2. Path Line Logic (Polyline Fix): Check for the jump
        if (tiangongPath.length > 0 && Math.abs(newLng - currentLng) > 180) {
            // If it crosses the antimeridian, reset the path to start a new segment
            tiangongPath = [];
        }
       
        // Push the new point, then update the polyline
        tiangongPath.push(newLatLng);
        tiangongPolyline.setLatLngs(tiangongPath);
    }
}
// Initial Calls
script.onload = () => { // Wait for Satellite.js to load
    updateTiangongPosition();
    setInterval(updateTiangongPosition, 1000); // Update every 1 second for smoothness
};
// FIXED: Added future path tracker for Tiangong (similar to ISS if needed)
function normalizeLng(lng) {
  return ((lng + 180) % 360 + 360) % 360 - 180;
}
function computeOrbit(tle1, tle2, minutes = 90) {
  const coordinates = [];
  const now = new Date();
  for (let i = 0; i <= minutes; i++) {
    const t = new Date(now.getTime() + i * 60 * 1000);
    const satrec = satellite.twoline2satrec(tle1, tle2);
    const positionAndVelocity = satellite.propagate(satrec, t);
    if (!positionAndVelocity.position) continue;
    const positionGd = satellite.eciToGeodetic(positionAndVelocity.position, satellite.gstime(t));
    const longitude = normalizeLng(satellite.degreesLong(positionGd.longitude));
    const latitude = satellite.degreesLat(positionGd.latitude);
    coordinates.push([longitude, latitude]);
  }
  return coordinates;
}
function addWrappedPathToMap(map, points, options = { color: 'blue', weight: 3, opacity: 0.8, dashArray: null }) {
  const polylines = [];
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i];
    const end = points[i + 1];
    const diff = end[0] - start[0];
    if (Math.abs(diff) > 180) {
      let boundary, unwrappedDiff;
      if (diff > 180) {
        unwrappedDiff = diff - 360;
        boundary = -180;
      } else {
        unwrappedDiff = diff + 360;
        boundary = 180;
      }
      const t = (boundary - start[0]) / unwrappedDiff;
      const intersectLat = start[1] + t * (end[1] - start[1]);
      const firstEnd = [boundary, intersectLat];
      const secondStart = [-boundary, intersectLat];
      polylines.push(L.polyline([start, firstEnd], options).addTo(map));
      polylines.push(L.polyline([secondStart, end], options).addTo(map));
    } else {
      polylines.push(L.polyline([start, end], options).addTo(map));
    }
  }
  return polylines;
}
// Example: Draw future Tiangong path (add for ISS similarly if needed)
script.onload = () => {
  const tgCoords = computeOrbit(TLE.TIANGONG.line1, TLE.TIANGONG.line2);
  addWrappedPathToMap(issMap, tgCoords);
  setInterval(() => {
    const tgNewCoords = computeOrbit(TLE.TIANGONG.line1, TLE.TIANGONG.line2);
    // Remove old polylines (implement removal logic if needed)
    addWrappedPathToMap(issMap, tgNewCoords);
  }, 60000);
};
