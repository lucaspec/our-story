import { useCallback, useState } from 'react';
import EventCard from './EventCard.jsx';

export default function Timeline({ events, startDate, focusedEventId }) {
  // Tracks how far down the timeline the user has scrolled, based on which
  // card indices have been revealed by IntersectionObserver. Drives a
  // progressive "fill" on the center line instead of an instant scroll-linked
  // calculation, which keeps it robust across viewport sizes.
  const [maxVisibleIndex, setMaxVisibleIndex] = useState(-1);

  const handleVisible = useCallback((index) => {
    setMaxVisibleIndex((prev) => (index > prev ? index : prev));
  }, []);

  const progress = events.length > 0 ? ((maxVisibleIndex + 1) / events.length) * 100 : 0;

  return (
    <div className="timeline">
      <div className="timeline__line" aria-hidden="true">
        <div className="timeline__line-fill" style={{ height: `${progress}%` }} />
      </div>
      <ol className="timeline__list">
        {events.map((event, index) => (
          <EventCard
            key={event.id}
            event={event}
            index={index}
            startDate={startDate}
            autoFocus={event.id === focusedEventId}
            onVisible={handleVisible}
          />
        ))}
      </ol>
    </div>
  );
}
