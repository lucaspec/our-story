import { useEffect, useRef, useState } from 'react';
import Lightbox from './Lightbox.jsx';

function formatDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function dayNumber(dateStr, startDate) {
  const start = new Date(`${startDate}T00:00:00`);
  const d = new Date(`${dateStr}T00:00:00`);
  const diff = Math.floor((d - start) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function EventCard({ event, index, startDate, autoFocus }) {
  const ref = useRef(null);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const day = dayNumber(event.date, startDate);

  useEffect(() => {
    if (autoFocus && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [autoFocus]);

  const photos = event.photos || [];
  const visiblePhotos = photos.slice(0, 4);
  const remaining = photos.length - visiblePhotos.length;

  return (
    <li id={`event-${event.id}`} ref={ref} className="event-card">
      <span className="event-card__dot" aria-hidden="true" />
      <div className="event-card__content">
        <p className="event-card__day">{day >= 0 ? `Day ${day}` : formatDate(event.date)}</p>
        <h2 className="event-card__date">{formatDate(event.date)}</h2>
        {event.title && <h3 className="event-card__title">{event.title}</h3>}
        {event.location?.name && <p className="event-card__location">📍 {event.location.name}</p>}
        {event.text && <p className="event-card__text">{event.text}</p>}

        {visiblePhotos.length > 0 && (
          <div className={`event-card__photos event-card__photos--${visiblePhotos.length}`}>
            {visiblePhotos.map((photo, i) => (
              <button
                key={photo.thumb}
                className="event-card__photo-btn"
                onClick={() => setLightboxIndex(i)}
                type="button"
              >
                <img src={photo.thumb} alt="" loading="lazy" />
                {i === 3 && remaining > 0 && (
                  <span className="event-card__more">+{remaining}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </li>
  );
}
