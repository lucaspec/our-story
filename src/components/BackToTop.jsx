import { useEffect, useState } from 'react';

// A little paper tab that appears once you're deep into the album, so you can
// get back to the cover without scrolling a year's worth of dates by hand.
export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame = 0;

    function update() {
      frame = 0;
      setVisible(window.scrollY > window.innerHeight * 1.1);
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
  }, []);

  function toTop() {
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  }

  return (
    <button
      type="button"
      className="to-top"
      data-visible={visible}
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      onClick={toTop}
      aria-label="Back to the top"
      title="Back to the top"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 19V6M5.5 12.5 12 6l6.5 6.5" />
      </svg>
      <span>top</span>
    </button>
  );
}
