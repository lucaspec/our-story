import { useEffect, useRef, useState } from 'react';

// Accepts a share link ("https://open.spotify.com/intl-de/playlist/<id>?si=…"),
// a URI ("spotify:playlist:<id>") or a bare id, and returns the embed URL.
function embedUrl(playlist) {
  const match = playlist.match(/playlist[/:]([A-Za-z0-9]+)/);
  const id = match ? match[1] : playlist.trim();
  return `https://open.spotify.com/embed/playlist/${id}?utm_source=generator`;
}

// A paper tab in the bottom-left corner that folds out our playlist. The
// player is only loaded on first open, then stays mounted while folded away
// so the music keeps going as you scroll and switch views.
export default function MusicPlayer({ playlist }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const rootRef = useRef(null);
  const toggleRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    function onPointerDown(e) {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    }
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function toggle() {
    setLoaded(true);
    setOpen((o) => !o);
  }

  return (
    <div className="music" ref={rootRef}>
      {loaded && (
        <div
          className="music__panel"
          data-open={open}
          role="dialog"
          aria-label="Our playlist"
          aria-hidden={!open}
        >
          <p className="music__title">Our songs ♫</p>
          <iframe
            className="music__player"
            title="Our playlist on Spotify"
            src={embedUrl(playlist)}
            height="152"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          />
        </div>
      )}

      <button
        ref={toggleRef}
        type="button"
        className="music__toggle"
        aria-expanded={open}
        aria-label="Our playlist"
        title="Our playlist"
        onClick={toggle}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 18V5.5l10-2V16M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM19 16a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z" />
        </svg>
        <span>music</span>
      </button>
    </div>
  );
}
