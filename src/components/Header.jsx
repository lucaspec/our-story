import { useMemo, useRef } from 'react';
import { daysSince, placeCity, stampDate } from '../utils/format.js';
import { useReveal } from '../hooks/useReveal.js';

// Spread a handful of thumbnails across the whole timeline so the drifting
// strip under the title is a fair sample of the story, not just its first week.
function stripPhotos(events, wanted = 16) {
  const pool = events.flatMap((event) => (event.photos || []).slice(0, 2));
  if (pool.length <= wanted) return pool;
  const step = pool.length / wanted;
  return Array.from({ length: wanted }, (_, i) => pool[Math.floor(i * step)]);
}

export default function Header({ config, events }) {
  const ref = useRef(null);
  useReveal(ref, [events.length]);

  const days = daysSince(config.startDate);
  const photos = useMemo(() => stripPhotos(events), [events]);
  const photoCount = useMemo(
    () => events.reduce((sum, e) => sum + (e.photos?.length || 0), 0),
    [events]
  );
  const placeCount = useMemo(
    () => new Set(events.map((e) => placeCity(e.location?.name)).filter(Boolean)).size,
    [events]
  );

  const stats = [
    { value: days.toLocaleString(), label: days === 1 ? 'day' : 'days' },
    { value: events.length, label: events.length === 1 ? 'date' : 'dates' },
    { value: placeCount, label: placeCount === 1 ? 'place' : 'places' },
    { value: photoCount, label: photoCount === 1 ? 'photo' : 'photos' },
  ];

  return (
    <header className="cover" ref={ref}>
      <div className="cover__sheet">
        <div className="cover__postmark" aria-hidden="true">
          <span className="cover__postmark-top">since</span>
          <span className="cover__postmark-date">{stampDate(config.startDate)}</span>
          <span className="cover__postmark-bottom">&#9733; first day &#9733;</span>
        </div>

        <div className="cover__inner reveal">
          <p className="cover__names">
            {config.personA}
            <span className="cover__heart" aria-hidden="true">
              &#10084;
            </span>
            {config.personB}
          </p>
          <h1 className="cover__title" data-text={config.title}>
            {config.title}
          </h1>
          <p className="cover__tagline">{config.tagline}</p>

          <dl className="cover__stats">
            {stats.map((stat) => (
              <div className="stub" key={stat.label}>
                <dt className="stub__value">{stat.value}</dt>
                <dd className="stub__label">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {photos.length > 2 && (
        <div className="cover__strip reveal" aria-hidden="true">
          <div className="cover__strip-track">
            {[0, 1].map((copy) => (
              <div className="cover__strip-run" key={copy}>
                {photos.map((photo, i) => (
                  <span className="cover__strip-frame" key={`${copy}-${photo.thumb}-${i}`}>
                    <img src={photo.thumb} alt="" loading="lazy" decoding="async" />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
