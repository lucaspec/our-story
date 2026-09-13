import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function Lightbox({ photos, startIndex, caption, onClose }) {
  const [index, setIndex] = useState(startIndex);
  const [dir, setDir] = useState(0);
  const touchRef = useRef(null);
  const stripRef = useRef(null);
  const closeRef = useRef(null);

  const go = useCallback(
    (delta) => {
      setDir(delta);
      setIndex((i) => (i + delta + photos.length) % photos.length);
    },
    [photos.length]
  );

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    }
    window.addEventListener('keydown', onKey);

    // Freeze the page behind the viewer so scrolling stays inside it.
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const returnFocusTo = document.activeElement;
    closeRef.current?.focus();

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
      if (returnFocusTo instanceof HTMLElement) returnFocusTo.focus();
    };
  }, [go, onClose]);

  // Keep the active thumbnail in view as you arrow through the set.
  useEffect(() => {
    stripRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [index]);

  const photo = photos[index];

  // Warm up the neighbouring frames so arrowing through feels instant.
  useEffect(() => {
    [1, -1].forEach((d) => {
      const p = photos[(index + d + photos.length) % photos.length];
      if (!p || p === photo) return;
      const img = new Image();
      img.src = p.full || p.thumb;
    });
  }, [index, photo, photos]);

  function onTouchStart(e) {
    touchRef.current = e.touches[0].clientX;
  }

  function onTouchEnd(e) {
    const start = touchRef.current;
    if (start == null) return;
    const dx = e.changedTouches[0].clientX - start;
    touchRef.current = null;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
  }

  // The cards carry a transform, which would make `position: fixed` resolve
  // against the card instead of the viewport — so the viewer lives on <body>.
  return createPortal(
    <div
      className="lightbox"
      data-solo={photos.length === 1}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={caption || 'Photo'}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="lightbox__bar" onClick={(e) => e.stopPropagation()}>
        <span className="lightbox__count">
          {String(index + 1).padStart(2, '0')} <i>/</i> {String(photos.length).padStart(2, '0')}
        </span>
        <button
          ref={closeRef}
          className="lightbox__close"
          onClick={onClose}
          type="button"
          aria-label="Close"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 5l14 14M19 5L5 19" />
          </svg>
        </button>
      </div>

      <div className="lightbox__stage" onClick={(e) => e.stopPropagation()}>
        <div className="lightbox__frame" key={photo.full || photo.thumb} data-dir={dir}>
          <img className="lightbox__image" src={photo.full || photo.thumb} alt="" />
        </div>
      </div>

      {photos.length > 1 && (
        <>
          <button
            className="lightbox__nav lightbox__nav--prev"
            type="button"
            aria-label="Previous photo"
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 4 7 12l8 8" />
            </svg>
          </button>
          <button
            className="lightbox__nav lightbox__nav--next"
            type="button"
            aria-label="Next photo"
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m9 4 8 8-8 8" />
            </svg>
          </button>

          <div className="lightbox__strip" ref={stripRef} onClick={(e) => e.stopPropagation()}>
            {photos.map((p, i) => (
              <button
                key={p.thumb}
                type="button"
                className="lightbox__thumb"
                data-active={i === index}
                aria-label={`Photo ${i + 1}`}
                onClick={() => {
                  setDir(i > index ? 1 : -1);
                  setIndex(i);
                }}
              >
                <img src={p.thumb} alt="" loading="lazy" decoding="async" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>,
    document.body
  );
}
