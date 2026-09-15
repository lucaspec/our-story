import { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { formatDate, placeCity, prettyPlace } from '../../utils/format.js';

// A wax-seal pin rather than Leaflet's default blue marker — the map is part of
// the same paper album as the timeline.
const pinIcon = L.divIcon({
  className: 'map-pin',
  html: `
    <svg viewBox="0 0 32 44" aria-hidden="true">
      <path class="map-pin__body" d="M16 1c8 0 14 6 14 13.5C30 25 18.5 39.6 16.9 42.4a1 1 0 0 1-1.8 0C13.5 39.6 2 25 2 14.5 2 7 8 1 16 1Z"/>
      <path class="map-pin__heart" d="M16 22.6c-3.3-2.4-5.4-4.2-5.4-6.6a2.9 2.9 0 0 1 5.4-1.6 2.9 2.9 0 0 1 5.4 1.6c0 2.4-2.1 4.2-5.4 6.6Z"/>
    </svg>`,
  iconSize: [32, 44],
  iconAnchor: [16, 42],
  popupAnchor: [0, -38],
});

export default function MapView({ events, config, onSelectEvent }) {
  const geoEvents = useMemo(
    () => events.filter((e) => e.location?.lat != null && e.location?.lng != null),
    [events]
  );

  const bounds = useMemo(() => {
    if (geoEvents.length < 2) return null;
    return L.latLngBounds(geoEvents.map((e) => [e.location.lat, e.location.lng])).pad(0.15);
  }, [geoEvents]);

  const placeCount = useMemo(
    () => new Set(geoEvents.map((e) => placeCity(e.location.name)).filter(Boolean)).size,
    [geoEvents]
  );

  return (
    <section className="map-view">
      <header className="map-view__head">
        <h2 className="map-view__title">Where we went</h2>
        <p className="map-view__note">
          {placeCount} {placeCount === 1 ? 'place' : 'places'} &middot; {geoEvents.length} pinned{' '}
          {geoEvents.length === 1 ? 'date' : 'dates'}
        </p>
      </header>

      <div className="map-view__paper">
        <span className="map-view__corner map-view__corner--tl" aria-hidden="true" />
        <span className="map-view__corner map-view__corner--tr" aria-hidden="true" />
        <span className="map-view__corner map-view__corner--bl" aria-hidden="true" />
        <span className="map-view__corner map-view__corner--br" aria-hidden="true" />

        <MapContainer
          // react-leaflet prefers center+zoom over bounds, so only pass the
          // configured fallback when there is nothing to fit.
          {...(bounds
            ? { bounds, boundsOptions: { padding: [24, 24], maxZoom: 12 } }
            : { center: config.mapDefaultCenter, zoom: config.mapDefaultZoom })}
          scrollWheelZoom
          className="map-view__container"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {geoEvents.map((event) => (
            <Marker key={event.id} position={[event.location.lat, event.location.lng]} icon={pinIcon}>
              <Popup closeButton={false}>
                <div className="map-popup">
                  {event.photos?.[0] && (
                    <img className="map-popup__image" src={event.photos[0].thumb} alt="" />
                  )}
                  <p className="map-popup__date">{formatDate(event.date)}</p>
                  {event.title && <p className="map-popup__title">{event.title}</p>}
                  {event.location.name && (
                    <p className="map-popup__location">{prettyPlace(event.location.name)}</p>
                  )}
                  <button
                    type="button"
                    className="map-popup__link"
                    onClick={() => onSelectEvent(event.id)}
                  >
                    View in album
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {geoEvents.length === 0 && (
        <p className="map-view__empty">None of your dates have location data yet.</p>
      )}
    </section>
  );
}
