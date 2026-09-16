import { useCallback, useEffect, useMemo, useState } from 'react';
import config from '../config.json';
import { useEvents } from './hooks/useEvents.js';
import Header from './components/Header.jsx';
import ViewToggle from './components/ViewToggle.jsx';
import Timeline from './components/Timeline/Timeline.jsx';
import MapView from './components/Map/MapView.jsx';
import SampleBanner from './components/SampleBanner.jsx';
import BackToTop from './components/BackToTop.jsx';
import JumpToMonth from './components/JumpToMonth.jsx';
import MusicPlayer from './components/MusicPlayer.jsx';
import Search from './components/Search.jsx';
import Intro, { shouldOpenAlbum } from './components/Intro.jsx';

export default function App() {
  const { loading, events, trips, isSample } = useEvents();
  const [view, setView] = useState('timeline');
  // What the timeline should scroll to next: a date or a trip folder. `at`
  // changes on every request, so asking for the same card twice still moves.
  const [focus, setFocus] = useState(null);
  const [intro, setIntro] = useState(shouldOpenAlbum);

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => a.date.localeCompare(b.date)),
    [events]
  );

  useEffect(() => {
    document.title = `${config.title} — ${config.personA} & ${config.personB}`;
  }, []);

  const closeIntro = useCallback(() => setIntro(false), []);

  const focusOn = useCallback((kind, id) => {
    setFocus((f) => ({ kind, id, at: (f?.at || 0) + 1 }));
    setView('timeline');
  }, []);
  const focusEvent = useCallback((id) => focusOn('event', id), [focusOn]);
  const focusTrip = useCallback((id) => focusOn('trip', id), [focusOn]);

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
            trips={trips}
            startDate={config.startDate}
            focus={focus}
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
      {sortedEvents.length > 0 && (
        <Search
          events={sortedEvents}
          trips={trips}
          onSelectEvent={focusEvent}
          onSelectTrip={focusTrip}
        />
      )}
      {config.spotifyPlaylist && <MusicPlayer playlist={config.spotifyPlaylist} />}
      <BackToTop />
      {intro && <Intro config={config} onDone={closeIntro} />}
    </div>
  );
}
