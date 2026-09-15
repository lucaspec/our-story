import { useEffect, useMemo, useRef, useState } from 'react';
import EventCard from './EventCard.jsx';
import { useReveal } from '../../hooks/useReveal.js';
import { monthKey, monthLabel } from '../../utils/format.js';

// Keep in sync with the .event-card__content max-width in global.css —
// it's how we know how much side-to-side slack the snake has to work with.
const CONTENT_WIDTH = 520;
const MAX_AMPLITUDE = 230;
const WAVE_FREQUENCY = 1.25;
// How far down the gap between two knots the bezier handles reach. Past ~0.5
// the curve leaves each knot travelling straight down and then swings hard
// across, which reads as a slack cord rather than a gentle zigzag.
const SWING = 0.55;
// Each page hides the cord behind it, so the only stretch you ever see is the
// open board below it. Start the sideways swing this far above the bottom of
// the page and the visible stretch is all curve instead of a straight stub.
const SWING_LEAD = 90;
// How many points we sample along the thread to map a y position back to a
// point on the curve, for the needle that rides the tip while you scroll.
const SAMPLES = 320;

function buildThreadPath(points) {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const gap = p1.y - p0.y;
    d += ` C ${p0.x} ${p0.y + gap * SWING}, ${p1.x} ${p1.y - gap * SWING}, ${p1.x} ${p1.y}`;
  }
  return d;
}

// Interleave month dividers into the event list so half a year of dates reads
// as chapters instead of one endless column.
function buildItems(events) {
  const items = [];
  let seenMonth = null;
  events.forEach((event, index) => {
    const key = monthKey(event.date);
    if (key !== seenMonth) {
      items.push({ type: 'chapter', key, ...monthLabel(event.date) });
      seenMonth = key;
    }
    items.push({ type: 'event', key: event.id, event, index });
  });
  return items;
}

export default function Timeline({ events, startDate, focusedEventId }) {
  const containerRef = useRef(null);
  const pathRef = useRef(null);
  const maskRef = useRef(null);
  const needleRef = useRef(null);
  const samplesRef = useRef([]);
  const [thread, setThread] = useState({ d: '', width: 0, height: 0 });

  const items = useMemo(() => buildItems(events), [events]);

  useReveal(containerRef, [events.length]);

  // Lay the cards out along a sine wave, then trace a curve through their dots.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    function layout() {
      const rows = container.querySelectorAll('.timeline__list > li');
      if (rows.length === 0) return;

      const containerWidth = container.clientWidth;
      const slack = containerWidth - CONTENT_WIDTH;
      const amplitude = Math.max(0, Math.min(MAX_AMPLITUDE, slack * 0.5));

      rows.forEach((row, i) => {
        // Chapter plates swing less than cards so they still read as anchors.
        const damping = row.classList.contains('chapter') ? 0.45 : 1;
        const offset = Math.round(Math.sin(i * WAVE_FREQUENCY) * amplitude * damping);
        row.style.setProperty('--snake-offset', `${offset}px`);
      });

      const containerRect = container.getBoundingClientRect();
      const points = [];
      rows.forEach((row) => {
        const node = row.querySelector('.thread-node');
        if (!node) return;
        const r = node.getBoundingClientRect();
        const x = r.left + r.width / 2 - containerRect.left;
        const knotY = r.top + r.height / 2 - containerRect.top;
        points.push({ x, y: knotY });
        // Drop straight down behind the page, then let the next segment do all
        // the swinging out in the open.
        const hangY = row.getBoundingClientRect().bottom - containerRect.top - SWING_LEAD;
        if (hangY > knotY + 20) points.push({ x, y: hangY });
      });

      setThread({
        d: buildThreadPath(points),
        width: containerWidth,
        height: container.scrollHeight,
      });
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

  // Reveal the thread from the top down as the page scrolls, with a needle
  // sitting at the point it has reached.
  useEffect(() => {
    const container = containerRef.current;
    const path = pathRef.current;
    const mask = maskRef.current;
    if (!container || !path || !mask || !thread.d) return undefined;

    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced) {
      mask.setAttribute('height', String(thread.height));
      needleRef.current?.setAttribute('opacity', '0');
      return undefined;
    }

    const total = path.getTotalLength();
    samplesRef.current = Array.from({ length: SAMPLES + 1 }, (_, i) =>
      path.getPointAtLength((total * i) / SAMPLES)
    );

    function pointAtY(y) {
      const pts = samplesRef.current;
      if (pts.length === 0) return null;
      let lo = 0;
      let hi = pts.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (pts[mid].y < y) lo = mid + 1;
        else hi = mid;
      }
      return pts[lo];
    }

    let frame = 0;

    function update() {
      frame = 0;
      const rect = container.getBoundingClientRect();
      // The stitch keeps pace a little below the middle of the viewport.
      const drawnY = -rect.top + window.innerHeight * 0.72;
      const clamped = Math.max(0, Math.min(thread.height, drawnY));
      mask.setAttribute('height', String(clamped));

      const needle = needleRef.current;
      if (!needle) return;
      const pts = samplesRef.current;
      const tip = pointAtY(clamped);
      // The needle only rides between the first and last knot — past the final
      // card the thread is simply finished.
      const active =
        tip && pts.length > 1 && clamped > pts[0].y + 4 && clamped < pts[pts.length - 1].y - 4;
      needle.setAttribute('opacity', active ? '1' : '0');
      if (tip) needle.setAttribute('transform', `translate(${tip.x} ${tip.y})`);
    }

    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update);
    }

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [thread]);

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
          <defs>
            <mask id="thread-reveal" maskUnits="userSpaceOnUse">
              <rect ref={maskRef} x="0" y="0" width={thread.width} height="0" fill="#fff" />
            </mask>
          </defs>
          <g mask="url(#thread-reveal)">
            <path className="timeline__thread-shadow" d={thread.d} />
            <path ref={pathRef} className="timeline__thread-line" d={thread.d} />
            <path className="timeline__thread-stitch" d={thread.d} />
          </g>
          <g ref={needleRef} className="timeline__needle" opacity="0">
            <circle r="7" />
            <circle className="timeline__needle-core" r="3" />
          </g>
        </svg>
      )}

      <ol className="timeline__list">
        {items.map((item) =>
          item.type === 'chapter' ? (
            <li className="chapter" id={`month-${item.key}`} key={`chapter-${item.key}`}>
              <span className="chapter__knot thread-node" aria-hidden="true" />
              <div className="chapter__plate reveal">
                <span className="chapter__ghost" aria-hidden="true">
                  {item.year}
                </span>
                <h2 className="chapter__label">
                  <span className="chapter__rule" aria-hidden="true" />
                  <span className="chapter__month">{item.month}</span>
                  <span className="chapter__rule" aria-hidden="true" />
                </h2>
              </div>
            </li>
          ) : (
            <EventCard
              key={item.key}
              event={item.event}
              index={item.index}
              startDate={startDate}
              autoFocus={item.event.id === focusedEventId}
            />
          )
        )}
      </ol>

      <div className="timeline__end">
        <span className="timeline__end-seal" aria-hidden="true">
          &#10084;
        </span>
        <p>to be continued</p>
      </div>
    </div>
  );
}
