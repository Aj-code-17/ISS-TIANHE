// Include Satellite.js library
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/satellite.js@4.0.0/dist/satellite.min.js';
document.head.appendChild(script);

// --- Custom Non-Wrapping Marker (your original code - kept as is) ---
L.NonWrappingMarker = L.Marker.extend({
    _setLatLng: function (latlng) {
        const mapCenterLng = this._map.getCenter().lng;
        let lng = latlng.lng;
        while (lng > mapCenterLng + 180) lng -= 360;
        while (lng < mapCenterLng - 180) lng += 360;
        this._latlng = L.latLng(latlng.lat, lng);
        if (this._icon) this._reset();
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

// ISS Marker
let issIcon = L.icon({
    iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/International_Space_Station_%28Expedition_58_Patch%29.svg/500px-International_Space_Station_%28Expedition_58_Patch%29.svg.png',
    iconSize: [70, 50]
});
let issMarker = L.nonWrappingMarker([0, 0], { icon: issIcon, title: 'ISS Position' }).addTo(issMap);

// Tiangong Marker
const tiangongIcon = L.icon({
    iconUrl: 'tiangong.png',
    iconSize: [50, 50]
});
const tiangongMarker = L.nonWrappingMarker([0, 0], { icon: tiangongIcon, title: 'Tiangong' }).addTo(issMap);

// --- FRESH TLEs (April 2026) ---
const TLE = {
    ISS: {
        line1: '1 25544U 98067A   26115.16771349  .00010683  00000-0  20209-3 0  9997',
        line2: '2 25544  51.6320 202.5215 0006921 348.0684  12.0139 15.48944607563533'
    },
    TIANGONG: {
        line1: '1 48274U 21035A   26114.50062074  .00024255  00000-0  26350-3 0  9991',
        line2: '2 48274  41.4668 288.9516 0006726 265.3935  94.6136 15.62882202284772'
    }
};

// User location marker (city name above precise pin - your improved version)
let userLat, userLon, userCity = 'N/A';
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(async pos => {
    userLat = pos.coords.latitude;
    userLon = pos.coords.longitude;
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLat}&lon=${userLon}&zoom=10&addressdetails=1`);
      const data = await response.json();
      userCity = data.address.city || data.address.town || data.address.village || 'Your Location';
    } catch (e) {
      userCity = 'Your Location';
    }
    if (document.getElementById('user-location-iss')) document.getElementById('user-location-iss').innerText = userCity;
    if (document.getElementById('user-location-tg')) document.getElementById('user-location-tg').innerText = userCity;

    const userIcon = L.divIcon({
      html: `
        <div style="position:relative; width:25px; height:41px;">
          <img src="https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png" style="position:absolute; top:0; left:0; width:25px; height:41px;">
          <div style="position:absolute; bottom:43px; left:50%; transform:translateX(-50%); background:white; color:black; padding:2px 6px; border-radius:4px; white-space:nowrap; font-size:12px; box-shadow:0 1px 3px rgba(0,0,0,0.3);">${userCity}</div>
        </div>
      `,
      className: '',
      iconSize: [25, 41],
      iconAnchor: [12.5, 41]
    });
    L.marker([userLat, userLon], {icon: userIcon}).addTo(issMap);
  });
}

// Utility functions
function normalizeLng(lng) {
  return ((lng + 180) % 360 + 360) % 360 - 180;
}

function getSatellitePosition(tle1, tle2, date) {
  const satrec = satellite.twoline2satrec(tle1, tle2);
  const posVel = satellite.propagate(satrec, date);
  if (!posVel.position) return null;
  const gd = satellite.eciToGeodetic(posVel.position, satellite.gstime(date));
  return {
    lat: satellite.degreesLat(gd.latitude),
    lng: normalizeLng(satellite.degreesLong(gd.longitude))
  };
}

// Improved antimeridian splitting
function addWrappedPathToMap(map, points, options = { color: 'red', weight: 3, opacity: 0.8 }) {
  // Remove old ISS/Tiangong paths if needed (you can extend this)
  map.eachLayer(layer => {
    if (layer instanceof L.Polyline && !layer.options.dashArray) {
      // Optional: add logic to remove only orbit lines
    }
  });

  const polylines = [];
  for (let i = 0; i < points.length - 1; i++) {
    let start = points[i];
    let end = points[i + 1];
    const diff = end[0] - start[0];
    if (Math.abs(diff) > 180) {
      const boundary = diff > 0 ? -180 : 180;
      const t = (boundary - start[0]) / (end[0] - start[0] + (diff > 0 ? -360 : 360));
      const interLat = start[1] + t * (end[1] - start[1]);
      polylines.push(L.polyline([start, [boundary, interLat]], options).addTo(map));
      polylines.push(L.polyline([[ -boundary, interLat ], end], options).addTo(map));
    } else {
      polylines.push(L.polyline([start, end], options).addTo(map));
    }
  }
  return polylines;
}

function computeOrbit(tle1, tle2, minutes = 90) {
  const coords = [];
  const now = new Date();
  for (let i = 0; i <= minutes; i++) {
    const t = new Date(now.getTime() + i * 60 * 1000);
    const pos = getSatellitePosition(tle1, tle2, t);
    if (pos) coords.push([pos.lng, pos.lat]);
  }
  return coords;
}

// Live ISS update (API) + future path starting from current position
async function updateISSWithPath() {
  try {
    const resp = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
    const d = await resp.json();
    const currentPos = [d.longitude, d.latitude];
    issMarker.setLatLng(currentPos);

    // Compute future path **starting from current real position**
    const futurePoints = computeOrbit(TLE.ISS.line1, TLE.ISS.line2);
    // Optional: prepend current position for perfect alignment
    futurePoints.unshift(currentPos);

    addWrappedPathToMap(issMap, futurePoints, { color: 'red', weight: 3, opacity: 0.85 });
  } catch (e) {
    console.error('ISS update error', e);
  }
}

// Tiangong update (kept your logic + solid line)
function updateTiangongPosition() {
  const now = new Date();
  const newLatLng = getTiangongPosition(TLE.TIANGONG.line1, TLE.TIANGONG.line2, now); // reuse your function if needed
  if (newLatLng) {
    tiangongMarker.setLatLng(newLatLng);
    // Your existing path logic for Tiangong (short trail)
    // ... (keep your tiangongPath + polyline code here if you want a live trail)
  }
}

// Initial setup
script.onload = () => {
  // Draw initial paths
  updateISSWithPath();
  updateTiangongPosition();

  // Refresh ISS + its future path every 5-10 seconds
  setInterval(updateISSWithPath, 8000);

  // Tiangong update
  setInterval(updateTiangongPosition, 1000);
};

// Your other functions (haversine, getTiangongPosition, etc.) can stay as they are
