// Create the 3D globe
   const globe = new WorldWind.WorldWindow("globe");
   globe.addLayer(new WorldWind.BMNGLayer()); // Add Earth texture
// Create the 2D map
   const map = L.map('map').setView([0, 0], 2);
   L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
function updateSun() {
     const now = new Date();
     // Find where it’s daytime
     const sunPos = SunCalc.getPosition(now, 0, 0);
     // Paint the night shadow on the globe
     const nightLayer = new WorldWind.SurfaceCircle(
       new WorldWind.Location(0, 0), 
       90 // Shadow size
     );
     nightLayer.attributes.interiorColor = new WorldWind.Color(0, 0, 0, 0.6);
     globe.addLayer(nightLayer);
   }
   updateSun();
// Fetch ISS position
   async function fetchISS() {
     const response = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
     const data = await response.json();
     return { lat: data.latitude, lon: data.longitude };
   }

   // Update every 5 seconds
   setInterval(async () => {
     const issPos = await fetchISS();
     // Add a marker on the globe
     const issPlacemark = new WorldWind.Placemark(
       new WorldWind.Position(issPos.lat, issPos.lon, 400000)
     );
     globe.addLayer(new WorldWind.RenderableLayer([issPlacemark]));
   }, 5000);
