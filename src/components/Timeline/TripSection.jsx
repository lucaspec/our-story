import EventCard from './EventCard.jsx';
import { formatRange, jitter, spanDays, stampShort } from '../../utils/format.js';

// A round customs stamp, inked in the trip's own colour. The country curves
// over the top of the ring, the arrival date sits in the middle.
function Stamp({ trip }) {
  const arc = `trip-arc-${trip.id}`;
  return (
    <svg className="trip__stamp" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <defs>
        <path id={arc} d="M 17 60 A 43 43 0 0 1 103 60" fill="none" />
      </defs>
      <circle className="trip__stamp-ring" cx="60" cy="60" r="52" />
      <circle className="trip__stamp-ring trip__stamp-ring--inner" cx="60" cy="60" r="41" />
      <text className="trip__stamp-arc">
        <textPath href={`#${arc}`} startOffset="50%" textAnchor="middle">
          {trip.stamp}
        </textPath>
      </text>
      <text className="trip__stamp-date" x="60" y="58" textAnchor="middle">
        {stampShort(trip.from)}
      </text>
      <path className="trip__stamp-rule" d="M40 67h40" />
      <text className="trip__stamp-foot" x="60" y="80" textAnchor="middle">
        arrived
      </text>
    </svg>
  );
}

// One trip, folded into a kraft pocket: a stamped cover, then every day of it
// on its own card with its own caption, stitched to a seam down the middle.
export default function TripSection({ trip, days, startDate, focusedEventId }) {
  // Seeded off the first day so the folder's tilt is stable and matches the
  // way the cards around it sit.
  const seed = days[0]?.index ?? 0;
  const tilt = (jitter(seed, 13) * 2.2 - 1.1).toFixed(2);
  // The calendar span, not the number of cards — a quiet day with no photos
  // was still a day away.
  const length = spanDays(trip.from, trip.to);

  return (
    <li
      className="trip"
      id={`trip-${trip.id}`}
      style={{ '--trip-ink': trip.ink, '--trip-tilt': `${tilt}deg` }}
    >
      <span className="trip__knot thread-node" aria-hidden="true" />

      <div className="trip__folder reveal">
        <span className="tape trip__tape trip__tape--left" aria-hidden="true" />
        <span className="tape trip__tape trip__tape--right" aria-hidden="true" />

        <header className="trip__cover">
          <div className="trip__titles">
            <p className="trip__kicker">the trip to</p>
            <h3 className="trip__name">{trip.name}</h3>
            <p className="trip__meta">
              <span>
                {length} {length === 1 ? 'day' : 'days'}
              </span>
              <i aria-hidden="true">&middot;</i>
              <span>{formatRange(trip.from, trip.to)}</span>
            </p>
          </div>
          <Stamp trip={trip} />
        </header>

        <ol className="trip__days">
          {days.map(({ event, index }) => (
            <EventCard
              key={event.id}
              event={event}
              index={index}
              startDate={startDate}
              autoFocus={event.id === focusedEventId}
              trip={trip}
            />
          ))}
        </ol>
      </div>
    </li>
  );
}
