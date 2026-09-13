import { useEffect, useRef, useState } from 'react';

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export default function Lightbox({ photos, startIndex, onClose }) {
  const [index, setIndex] = useState(startIndex);
  const [direction, setDirection] = useState('next');
  const [phase, setPhase] = useState('opening'); // 'opening' -> 'open' -> 'closing'
  const closeTimer = useRef(null);

  // Kick off the open animation on mount (skips itself for reduced motion,
  // since the base/opening/open styles resolve to the same thing then).
  useEffect(() => {
    const raf = requestAnimationFrame(() => setPhase('open'));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    []
  );

  function requestClose() {
    if (prefersReducedMotion()) {
      onClose();
      return;
    }
    setPhase('closing');
    closeTimer.current = setTimeout(onClose, 200);
  }

  function goNext() {
    setDirection('next');
    setIndex((i) => (i + 1) % photos.length);
  }

  function goPrev() {
    setDirection('prev');
    setIndex((i) => (i - 1 + photos.length) % photos.length);
  }

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') requestClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos.length]);

  const photo = photos[index];

  return (
    <div
      className={`lightbox lightbox--${phase}`}
      onClick={requestClose}
      role="dialog"
      aria-modal="true"
    >
      <button className="lightbox__close" onClick={requestClose} type="button" aria-label="Close">
        &times;
      </button>
      {photos.length > 1 && (
        <button
          className="lightbox__nav lightbox__nav--prev"
          type="button"
          aria-label="Previous photo"
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
        >
          &#8249;
        </button>
      )}
      <div className="lightbox__stage" onClick={(e) => e.stopPropagation()}>
        <img
          key={index}
          className={`lightbox__image lightbox__image--${direction}`}
          src={photo.full || photo.thumb}
          alt=""
        />
      </div>
      {photos.length > 1 && (
        <button
          className="lightbox__nav lightbox__nav--next"
          type="button"
          aria-label="Next photo"
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
        >
          &#8250;
        </button>
      )}
    </div>
  );
}
