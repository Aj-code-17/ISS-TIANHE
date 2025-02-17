// 1. Initialize the 3D Globe
const globe = new WorldWind.WorldWindow("globe");

// Add Earth texture and grid
globe.addLayer(new WorldWind.BMNGLayer()); // Earth image
globe.addLayer(new WorldWind.CoordinatesDisplayLayer(globe)); // Lat/long grid
globe.addLayer(new WorldWind.CompassLayer()); // Compass

// 2. Initialize the 2D Map
const map = L.map('map').setView([0, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// 3. Add a test marker (to confirm the globe works)
const testPlacemark = new WorldWind.Placemark(
  new WorldWind.Position(0, 0, 0), // Equator
  false,
  new WorldWind.PlacemarkAttributes({
    imageSource: "https://img.icons8.com/color/48/marker.png", // Test icon
    imageScale: 0.5
  })
);
globe.addLayer(new WorldWind.RenderableLayer([testPlacemark]));
