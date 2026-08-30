function daysTogether(startDate) {
  const start = new Date(`${startDate}T00:00:00`);
  const now = new Date();
  const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? diff : 0;
}

export default function Header({ config, eventCount }) {
  const days = daysTogether(config.startDate);

  return (
    <header className="header">
      <p className="header__names">
        {config.personA} <span className="header__heart">&#10084;</span> {config.personB}
      </p>
      <h1 className="header__title">{config.title}</h1>
      <p className="header__tagline">{config.tagline}</p>
      <div className="header__stats">
        <span>{days.toLocaleString()} days together</span>
        <span className="header__dot">&bull;</span>
        <span>
          {eventCount} {eventCount === 1 ? 'date' : 'dates'} captured
        </span>
      </div>
    </header>
  );
}
