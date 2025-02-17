// Create the 3D globe
   const globe = new WorldWind.WorldWindow("globe");
   globe.addLayer(new WorldWind.BMNGLayer()); // Add Earth texture
// Create the 2D map
   const map = L.map('map').setView([0, 0], 2);
   L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
