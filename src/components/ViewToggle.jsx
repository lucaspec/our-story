const VIEWS = [
  {
    id: 'timeline',
    label: 'The album',
    icon: 'M4 4h13a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3Zm3 3v10M9 8h8M9 11h8M9 14h5',
  },
  {
    id: 'map',
    label: 'The map',
    icon: 'M9 3 3 5.5v15L9 18l6 3 6-2.5v-15L15 6Zm0 0v15m6-12v15',
  },
];

export default function ViewToggle({ view, onChange }) {
  return (
    <nav className="view-toggle" aria-label="View">
      <div className="view-toggle__group">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            className="view-toggle__btn"
            aria-pressed={view === v.id}
            onClick={() => onChange(v.id)}
            type="button"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d={v.icon} />
            </svg>
            {v.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
