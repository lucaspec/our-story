import { useEffect, useState } from 'react';

export default function Lightbox({ photos, startIndex, onClose }) {
  const [index, setIndex] = useState(startIndex);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % photos.length);
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + photos.length) % photos.length);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [photos.length, onClose]);

  const photo = photos[index];

  return (
    <div className="lightbox" onClick={onClose} role="dialog" aria-modal="true">
      <button className="lightbox__close" onClick={onClose} type="button" aria-label="Close">
        &times;
      </button>
      {photos.length > 1 && (
        <button
          className="lightbox__nav lightbox__nav--prev"
          type="button"
          aria-label="Previous photo"
          onClick={(e) => {
            e.stopPropagation();
            setIndex((i) => (i - 1 + photos.length) % photos.length);
          }}
        >
          &#8249;
        </button>
      )}
      <img
        className="lightbox__image"
        src={photo.full || photo.thumb}
        alt=""
        onClick={(e) => e.stopPropagation()}
      />
      {photos.length > 1 && (
        <button
          className="lightbox__nav lightbox__nav--next"
          type="button"
          aria-label="Next photo"
          onClick={(e) => {
            e.stopPropagation();
            setIndex((i) => (i + 1) % photos.length);
          }}
        >
          &#8250;
        </button>
      )}
    </div>
  );
}
