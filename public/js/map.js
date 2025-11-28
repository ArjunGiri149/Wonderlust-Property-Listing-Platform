maptilersdk.config.apiKey = mapToken;
const map = new maptilersdk.Map({
  container: "map",
  style: maptilersdk.MapStyle.STREETS,
  center: coordinate,
  zoom: 11,
});

console.log(coordinate);

const marker = new maptilersdk.Marker({
  color: "#ff0000",
})
  .setLngLat(coordinate)
  .addTo(map);

const popup = new maptilersdk.Popup({ offset: 25 }).setHTML(
  "Exact location will be provided after booking!"
);

marker.setPopup(popup);
