import { useEffect } from 'react';

// Distance from the top of the document, ignoring transforms — `.reveal`
// starts nudged down, so a getBoundingClientRect() read would be off by that
// nudge exactly when we're deciding whether the element is on screen.
function documentTop(el) {
  let top = 0;
  let node = el;
  while (node) {
    top += node.offsetTop;
    node = node.offsetParent;
  }
  return top;
}

// Adds `is-in` to every `.reveal` inside the container once it scrolls into
// view, which is what the CSS entrance animations hang off. Elements that
// already animated are left alone so scrolling back up doesn't replay them.
export function useReveal(rootRef, deps = []) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const els = Array.from(root.querySelectorAll('.reveal:not(.is-in)'));
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced || typeof IntersectionObserver === 'undefined') {
      els.forEach((el) => el.classList.add('is-in'));
      return undefined;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0 }
    );

    // Anything already on screen at first paint is shown straight away —
    // otherwise the negative bottom margin can leave the first fold blank.
    els.forEach((el) => {
      if (documentTop(el) < window.scrollY + window.innerHeight) el.classList.add('is-in');
      else io.observe(el);
    });
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
