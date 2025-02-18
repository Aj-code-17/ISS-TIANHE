// Initialize 3D Globe
const globe = new WorldWind.WorldWindow("globe");
globe.addLayer(new WorldWind.BMNGLayer());
globe.addLayer(new WorldWind.CompassLayer());

// Initialize 2D Map
const map = L.map('map').setView([0, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// Test ISS marker (fixed position)
const issPlacemark = new WorldWind.Placemark(
  new WorldWind.Position(0, 0, 400000),
  false,
  new WorldWind.PlacemarkAttributes({
    imageSource: "https://img.icons8.com/color/48/iss.png",
    imageScale: 0.5
  })
);
globe.addLayer(new WorldWind.RenderableLayer([issPlacemark]));
