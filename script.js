// Include Satellite.js library
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/satellite.js@4.0.0/dist/satellite.min.js';
document.head.appendChild(script);
// Custom Leaflet Marker Type
L.NonWrappingMarker = L.Marker.extend({
    _setLatLng: function (latlng) {
        const mapCenterLng = this._map.getCenter().lng;
        let lng = latlng.lng;
        while (lng > mapCenterLng + 180) {
            lng -= 360;
        }
        while (lng < mapCenterLng - 180) {
            lng += 360;
        }
        this._latlng = L.latLng(latlng.lat, lng);
        if (this._icon) {
            this._reset();
        }
    }
});
L.nonWrappingMarker = function (latlng, options) {
    return new L.NonWrappingMarker(latlng, options);
};
// Initialize map
let issMap = L.map('map-container', {
    maxBounds: [[-90, -180], [90, 180]],
    maxBoundsViscosity: 1,
    worldCopyJump: true
}).setView([30, 0], 1.5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(issMap);
// ISS icon and marker
let issIcon = L.icon({
    iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/International_Space_Station_%28Expedition_58_Patch%29.svg/500px-International_Space_Station_%28Expedition_58_Patch%29.svg.png',
    iconSize: [70, 50]
});
let marker = L.nonWrappingMarker([0, 0], { icon: issIcon, title: 'ISS Position', alt: 'ISS icon' }).addTo(issMap);
// Tiangong icon and marker
const tiangongIcon = L.icon({
    iconUrl: 'tiangong.png',
    iconSize: [50, 50]
});
const tiangongMarker = L.nonWrappingMarker([0, 0], { icon: tiangongIcon, title: 'Tiangong' }).addTo(issMap);
let tiangongPath = [];
const tiangongPolyline = L.polyline([], {
    color: 'blue',
    weight: 3,
    opacity: 0.8,
    dashArray: null
}).addTo(issMap);
// TLE Data
const TLE = {
    TIANGONG: {
        line1: '1 48274U 21035A   25333.06763102  .00014333  00000+0  18674-3 0  9999',
        line2: '2 48274  41.4664  99.6574 0010668 290.8853  69.0842 15.58380651261895'
    }
};
// Get user's location for distance calculation (with permission)
let userLat, userLon;
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(pos => {
    userLat = pos.coords.latitude;
    userLon = pos.coords.longitude;
  }, err => {
    console.error('Geolocation error', err);
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
// TLE Utility Functions
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
// ISS Function (API Update) with data updates
const getIssLocation = async () => {
    try {
        const resp = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
        const d = await resp.json();
        marker.setLatLng(L.latLng(d.latitude, d.longitude));
        // Update display data (assuming HTML has the spans)
        const lat = d.latitude;
        const lon = d.longitude;
        const latStr = `${Math.abs(lat).toFixed(2)} ${lat < 0 ? 'South' : 'North'}`;
        const lonStr = `${Math.abs(lon).toFixed(2)} ${lon < 0 ? 'West' : 'East'}`;
        // Time in UTC+5
        const date = new Date(d.timestamp * 1000);
        let hours = date.getUTCHours() + 5;
        let carryDays = 0;
        if (hours >= 24) {
          hours -= 24;
          carryDays = 1;
        }
        const tempDate = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + carryDays);
        const day = tempDate.getUTCDate();
        const monthIndex = tempDate.getUTCMonth();
        const year = tempDate.getUTCFullYear();
        const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][monthIndex];
        const mins = String(date.getUTCMinutes()).padStart(2, '0');
        const secs = String(date.getUTCSeconds()).padStart(2, '0');
        const timeStr = `${day}. ${month}. ${year}, ${String(hours).padStart(2, '0')}:${mins}:${secs}`;
        if (document.getElementById('iss-time')) document.getElementById('iss-time').innerText = timeStr;
        if (document.getElementById('iss-speed')) document.getElementById('iss-speed').innerText = d.velocity.toFixed(2);
        if (document.getElementById('iss-altitude')) document.getElementById('iss-altitude').innerText = d.altitude.toFixed(2);
        if (document.getElementById('iss-lat')) document.getElementById('iss-lat').innerText = latStr;
        if (document.getElementById('iss-lon')) document.getElementById('iss-lon').innerText = lonStr;
        let distStr = 'N/A';
        if (typeof userLat !== 'undefined') {
          const dist = haversine(lat, lon, userLat, userLon);
          distStr = dist.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        }
        if (document.getElementById('iss-distance')) document.getElementById('iss-distance').innerText = distStr;
        // Orbital period
        const GM = 3.986004418e5;
        const a = 6371 + d.altitude;
        const period_sec = 2 * Math.PI * Math.sqrt(a ** 3 / GM);
        const min = Math.floor(period_sec / 60);
        const sec = Math.round(period_sec % 60);
        const meanMotion = 15.49177370; // Hardcoded from TLE for ISS (update if needed)
        const period_avg = 1440 / meanMotion;
        const min_avg = Math.floor(period_avg);
        const sec_avg = Math.round((period_avg - min_avg) * 60);
        const periodStr = `${min} m ${String(sec).padStart(2, '0')} s (on average ∅: ${min_avg} m ${String(sec_avg).padStart(2, '0')} s | ${meanMotion} orbits per day)`;
        if (document.getElementById('iss-period')) document.getElementById('iss-period').innerText = periodStr;
    } catch (e) {
        console.error('ISS fetch error', e);
    }
};
setInterval(getIssLocation, 5000);
// Tiangong Functions with data updates
function updateTiangongPosition() {
    const now = new Date();
    const newPos = getTiangongPosition(TLE.TIANGONG.line1, TLE.TIANGONG.line2, now);
    if (newPos) {
        const currentLng = tiangongMarker.getLatLng().lng;
        const newLng = newPos.lng;
        tiangongMarker.setLatLng(L.latLng(newPos.lat, newPos.lng));
        if (tiangongPath.length > 0 && Math.abs(newLng - currentLng) > 180) {
            tiangongPath = [];
        }
        tiangongPath.push(L.latLng(newPos.lat, newPos.lng));
        tiangongPolyline.setLatLngs(tiangongPath);
        // Update display data
        const lat = newPos.lat;
        const lon = newPos.lng;
        const latStr = `${Math.abs(lat).toFixed(2)} ${lat < 0 ? 'South' : 'North'}`;
        const lonStr = `${Math.abs(lon).toFixed(2)} ${lon < 0 ? 'West' : 'East'}`;
        // Time in UTC+5
        const date = new Date(newPos.timestamp * 1000);
        let hours = date.getUTCHours() + 5;
        let carryDays = 0;
        if (hours >= 24) {
          hours -= 24;
          carryDays = 1;
        }
        const tempDate = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + carryDays);
        const day = tempDate.getUTCDate();
        const monthIndex = tempDate.getUTCMonth();
        const year = tempDate.getUTCFullYear();
        const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][monthIndex];
        const mins = String(date.getUTCMinutes()).padStart(2, '0');
        const secs = String(date.getUTCSeconds()).padStart(2, '0');
        const timeStr = `${day}. ${month}. ${year}, ${String(hours).padStart(2, '0')}:${mins}:${secs}`;
        if (document.getElementById('tg-time')) document.getElementById('tg-time').innerText = timeStr;
        if (document.getElementById('tg-speed')) document.getElementById('tg-speed').innerText = newPos.velocity.toFixed(2);
        if (document.getElementById('tg-altitude')) document.getElementById('tg-altitude').innerText = newPos.altitude.toFixed(2);
        if (document.getElementById('tg-lat')) document.getElementById('tg-lat').innerText = latStr;
        if (document.getElementById('tg-lon')) document.getElementById('tg-lon').innerText = lonStr;
        let distStr = 'N/A';
        if (typeof userLat !== 'undefined') {
          const dist = haversine(lat, lon, userLat, userLon);
          distStr = dist.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        }
        if (document.getElementById('tg-distance')) document.getElementById('tg-distance').innerText = distStr;
        // Orbital period
        const GM = 3.986004418e5;
        const a = 6371 + newPos.altitude;
        const period_sec = 2 * Math.PI * Math.sqrt(a ** 3 / GM);
        const min = Math.floor(period_sec / 60);
        const sec = Math.round(period_sec % 60);
        const meanMotion = 15.58380651; // Hardcoded from TLE for Tiangong (update if needed)
        const period_avg = 1440 / meanMotion;
        const min_avg = Math.floor(period_avg);
        const sec_avg = Math.round((period_avg - min_avg) * 60);
        const periodStr = `${min} m ${String(sec).padStart(2, '0')} s (on average ∅: ${min_avg} m ${String(sec_avg).padStart(2, '0')} s | ${meanMotion} orbits per day)`;
        if (document.getElementById('tg-period')) document.getElementById('tg-period').innerText = periodStr;
    }
}
// Initial Calls
script.onload = () => {
    updateTiangongPosition();
    setInterval(updateTiangongPosition, 1000);
};
// Future path for Tiangong (and ISS if added)
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
script.onload = () => {
  const tgCoords = computeOrbit(TLE.TIANGONG.line1, TLE.TIANGONG.line2);
  addWrappedPathToMap(issMap, tgCoords);
  setInterval(() => {
    const tgNewCoords = computeOrbit(TLE.TIANGONG.line1, TLE.TIANGONG.line2);
    addWrappedPathToMap(issMap, tgNewCoords);
  }, 60000);
};
