import { useEffect, useRef, useState } from 'react';
import EventCard from './EventCard.jsx';

// Keep in sync with the .event-card__content max-width in global.css —
// it's how we know how much side-to-side slack the snake has to work with.
const CONTENT_WIDTH = 420;
const MAX_AMPLITUDE = 140;
const WAVE_FREQUENCY = 0.8;

function buildThreadPath(points) {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const midY = (p0.y + p1.y) / 2;
    d += ` C ${p0.x} ${midY}, ${p1.x} ${midY}, ${p1.x} ${p1.y}`;
  }
  return d;
}

export default function Timeline({ events, startDate, focusedEventId }) {
  const containerRef = useRef(null);
  const [thread, setThread] = useState({ d: '', width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    function layout() {
      const items = container.querySelectorAll('.event-card');
      if (items.length === 0) return;

      const containerWidth = container.clientWidth;
      const amplitude = Math.max(0, Math.min(MAX_AMPLITUDE, (containerWidth - CONTENT_WIDTH) / 2 - 24));

      items.forEach((li, i) => {
        const offset = Math.round(Math.sin(i * WAVE_FREQUENCY) * amplitude);
        li.style.setProperty('--snake-offset', `${offset}px`);
      });

      const containerRect = container.getBoundingClientRect();
      const points = Array.from(container.querySelectorAll('.event-card__dot')).map((dot) => {
        const r = dot.getBoundingClientRect();
        return {
          x: r.left + r.width / 2 - containerRect.left,
          y: r.top + r.height / 2 - containerRect.top,
        };
      });

      setThread({ d: buildThreadPath(points), width: containerWidth, height: container.scrollHeight });
    }

    layout();

    const ro = new ResizeObserver(layout);
    ro.observe(container);

    const imgs = container.querySelectorAll('img');
    imgs.forEach((img) => {
      if (!img.complete) img.addEventListener('load', layout, { once: true });
    });

    return () => ro.disconnect();
  }, [events]);

  return (
    <div className="timeline" ref={containerRef}>
      {thread.d && (
        <svg
          className="timeline__thread"
          width={thread.width}
          height={thread.height}
          viewBox={`0 0 ${thread.width} ${thread.height}`}
          aria-hidden="true"
        >
          <path className="timeline__thread-shadow" d={thread.d} />
          <path className="timeline__thread-line" d={thread.d} />
          <path className="timeline__thread-highlight" d={thread.d} />
        </svg>
      )}
      <ol className="timeline__list">
        {events.map((event, index) => (
          <EventCard
            key={event.id}
            event={event}
            index={index}
            startDate={startDate}
            autoFocus={event.id === focusedEventId}
          />
        ))}
      </ol>
    </div>
  );
}
