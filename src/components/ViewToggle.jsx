const VIEWS = [
  { id: 'timeline', label: 'Timeline' },
  { id: 'map', label: 'Map' },
];

export default function ViewToggle({ view, onChange }) {
  return (
    <nav className="view-toggle">
      {VIEWS.map((v) => (
        <button
          key={v.id}
          className={`view-toggle__btn ${view === v.id ? 'view-toggle__btn--active' : ''}`}
          onClick={() => onChange(v.id)}
          type="button"
        >
          {v.label}
        </button>
      ))}
    </nav>
  );
}
