import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

const heartIcon = L.divIcon({
  className: 'map-pin',
  html: '<span class="map-pin__heart">&#10084;</span>',
  iconSize: [28, 28],
  iconAnchor: [14, 26],
  popupAnchor: [0, -24],
});

function formatDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function MapView({ events, config, onSelectEvent }) {
  const geoEvents = events.filter((e) => e.location?.lat != null && e.location?.lng != null);

  return (
    <div className="map-view">
      <MapContainer
        center={config.mapDefaultCenter}
        zoom={config.mapDefaultZoom}
        scrollWheelZoom
        className="map-view__container"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {geoEvents.map((event) => (
          <Marker key={event.id} position={[event.location.lat, event.location.lng]} icon={heartIcon}>
            <Popup>
              <div className="map-popup">
                {event.photos?.[0] && (
                  <img className="map-popup__image" src={event.photos[0].thumb} alt="" />
                )}
                <p className="map-popup__date">{formatDate(event.date)}</p>
                {event.location.name && <p className="map-popup__location">{event.location.name}</p>}
                <button
                  type="button"
                  className="map-popup__link"
                  onClick={() => onSelectEvent(event.id)}
                >
                  View in timeline
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {geoEvents.length === 0 && (
        <p className="map-view__empty">None of your dates have location data yet.</p>
      )}
    </div>
  );
}
