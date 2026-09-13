import { useEffect, useMemo, useState } from 'react';
import config from '../config.json';
import { useEvents } from './hooks/useEvents.js';
import Header from './components/Header.jsx';
import ViewToggle from './components/ViewToggle.jsx';
import Timeline from './components/Timeline/Timeline.jsx';
import MapView from './components/Map/MapView.jsx';
import SampleBanner from './components/SampleBanner.jsx';

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

const VIEW_TRANSITION_MS = 220;

export default function App() {
  const { loading, events, isSample } = useEvents();
  const [view, setView] = useState('timeline');
  const [focusedEventId, setFocusedEventId] = useState(null);

  // The view toggle switches instantly (so its active state feels snappy),
  // but the rendered content crossfades out/in rather than swapping in place.
  const [displayView, setDisplayView] = useState('timeline');
  const [viewPhase, setViewPhase] = useState('in');

  useEffect(() => {
    if (view === displayView) return undefined;

    if (prefersReducedMotion()) {
      setDisplayView(view);
      setViewPhase('in');
      return undefined;
    }

    setViewPhase('out');
    const timer = setTimeout(() => {
      setDisplayView(view);
      setViewPhase('in');
    }, VIEW_TRANSITION_MS);
    return () => clearTimeout(timer);
  }, [view, displayView]);

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => a.date.localeCompare(b.date)),
    [events]
  );

  function focusEvent(id) {
    setFocusedEventId(id);
    setView('timeline');
  }

  return (
    <div className="app">
      <Header config={config} eventCount={sortedEvents.length} />
      {isSample && <SampleBanner />}
      <ViewToggle view={view} onChange={setView} />
      <main className="app__main">
        {loading ? (
          <p className="app__loading">Loading our story…</p>
        ) : sortedEvents.length === 0 ? (
          <p className="app__loading">No dates yet — run the import script to add your photos.</p>
        ) : (
          <div className={`app__view app__view--${viewPhase}`}>
            {displayView === 'timeline' ? (
              <Timeline events={sortedEvents} startDate={config.startDate} focusedEventId={focusedEventId} />
            ) : (
              <MapView events={sortedEvents} config={config} onSelectEvent={focusEvent} />
            )}
          </div>
        )}
      </main>
      <footer className="app__footer">
        Made with love by {config.personA} &amp; {config.personB}
      </footer>
    </div>
  );
}
