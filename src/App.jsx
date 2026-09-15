import { useEffect, useMemo, useState } from 'react';
import config from '../config.json';
import { useEvents } from './hooks/useEvents.js';
import Header from './components/Header.jsx';
import ViewToggle from './components/ViewToggle.jsx';
import Timeline from './components/Timeline/Timeline.jsx';
import MapView from './components/Map/MapView.jsx';
import SampleBanner from './components/SampleBanner.jsx';
import BackToTop from './components/BackToTop.jsx';
import JumpToMonth from './components/JumpToMonth.jsx';

export default function App() {
  const { loading, events, isSample } = useEvents();
  const [view, setView] = useState('timeline');
  const [focusedEventId, setFocusedEventId] = useState(null);

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => a.date.localeCompare(b.date)),
    [events]
  );

  useEffect(() => {
    document.title = `${config.title} — ${config.personA} & ${config.personB}`;
  }, []);

  function focusEvent(id) {
    setFocusedEventId(id);
    setView('timeline');
  }

  return (
    <div className="app">
      <div className="app__grain" aria-hidden="true" />
      <Header config={config} events={sortedEvents} />
      {isSample && <SampleBanner />}
      <ViewToggle view={view} onChange={setView} />
      <main className="app__main" data-view={view}>
        {loading ? (
          <p className="app__loading">Loading our story…</p>
        ) : sortedEvents.length === 0 ? (
          <p className="app__loading">No dates yet — run the import script to add your photos.</p>
        ) : view === 'timeline' ? (
          <Timeline
            events={sortedEvents}
            startDate={config.startDate}
            focusedEventId={focusedEventId}
          />
        ) : (
          <MapView events={sortedEvents} config={config} onSelectEvent={focusEvent} />
        )}
      </main>
      <footer className="app__footer">
        <span className="app__footer-rule" aria-hidden="true" />
        <p>
          Made with love by {config.personA}
        </p>
      </footer>
      {view === 'timeline' && sortedEvents.length > 0 && <JumpToMonth events={sortedEvents} />}
      <BackToTop />
    </div>
  );
}
