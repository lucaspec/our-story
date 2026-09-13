import { useEffect, useRef, useState } from 'react';
import Lightbox from './Lightbox.jsx';
import {
  dateParts,
  dayNumber,
  formatDate,
  formatWeekday,
  jitter,
  prettyPlace,
} from '../../utils/format.js';

// Photo 1 gets the wide slot in 1- and 3-photo layouts; everything else sits in
// the square half-width slots. Kept as data so the CSS grid stays declarative.
function layoutOf(count) {
  if (count <= 1) return 'solo';
  if (count === 3) return 'hero';
  return 'grid';
}

export default function EventCard({ event, index, startDate, autoFocus }) {
  const ref = useRef(null);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const day = dayNumber(event.date, startDate);
  const stamp = dateParts(event.date);
  const place = prettyPlace(event.location?.name);

  useEffect(() => {
    if (autoFocus && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      ref.current.classList.add('event-card--flash');
      const t = setTimeout(() => ref.current?.classList.remove('event-card--flash'), 2000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [autoFocus]);

  const photos = event.photos || [];
  const visiblePhotos = photos.slice(0, 4);
  const remaining = photos.length - visiblePhotos.length;
  const layout = layoutOf(visiblePhotos.length);

  // Paper never lands perfectly square — each card gets its own small,
  // stable tilt and its own tape colour.
  const tilt = (jitter(index, 1) * 2.6 - 1.3).toFixed(2);
  const variant = index % 4;

  return (
    <li
      id={`event-${event.id}`}
      ref={ref}
      className="event-card"
      style={{ '--tilt': `${tilt}deg` }}
    >
      <span className="event-card__dot thread-node" aria-hidden="true" />

      <article className="event-card__content reveal" data-variant={variant}>
        <span className="tape" aria-hidden="true" />

        <div className="event-card__head">
          <span className="postage" aria-hidden="true">
            <span className="postage__day">{stamp.day}</span>
            <span className="postage__month">{stamp.month}</span>
            <span className="postage__year">{stamp.year}</span>
          </span>

          <div className="event-card__heading">
            <p className="event-card__meta">
              {day >= 0 && <span className="event-card__day">Day {day.toLocaleString()}</span>}
              <span className="event-card__weekday">{formatWeekday(event.date)}</span>
            </p>
            <h3 className="event-card__title">{event.title || formatDate(event.date)}</h3>
            {place && (
              <p className="event-card__location">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M12 2a7 7 0 0 0-7 7c0 5.1 6.2 12.3 6.5 12.6a.7.7 0 0 0 1 0C12.8 21.3 19 14.1 19 9a7 7 0 0 0-7-7Zm0 9.6A2.6 2.6 0 1 1 12 6.4a2.6 2.6 0 0 1 0 5.2Z" />
                </svg>
                {place}
              </p>
            )}
          </div>
        </div>

        {event.text && <p className="event-card__text">{event.text}</p>}

        {visiblePhotos.length > 0 && (
          <div className="collage" data-layout={layout}>
            {visiblePhotos.map((photo, i) => (
              <button
                key={photo.thumb}
                className="shot"
                style={{ '--shot-tilt': `${(jitter(index, i + 2) * 4 - 2).toFixed(2)}deg` }}
                onClick={() => setLightboxIndex(i)}
                type="button"
                aria-label={`Open photo ${i + 1} of ${photos.length}`}
              >
                <span className="shot__frame">
                  <img src={photo.thumb} alt="" loading="lazy" decoding="async" />
                  <span className="shot__sheen" aria-hidden="true" />
                  {i === 3 && remaining > 0 && (
                    <span className="shot__more">
                      <em>+{remaining}</em>
                      more
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        )}

        {photos.length > 0 && (
          <p className="event-card__foot">
            <span className="event-card__foot-rule" aria-hidden="true" />
            {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
          </p>
        )}
      </article>

      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          startIndex={lightboxIndex}
          caption={event.title}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </li>
  );
}
