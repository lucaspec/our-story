import EventCard from './EventCard.jsx';

export default function Timeline({ events, startDate, focusedEventId }) {
  return (
    <div className="timeline">
      <div className="timeline__thread" aria-hidden="true" />
      <ol className="timeline__list">
        {events.map((event, index) => (
          <EventCard
            key={event.id}
            event={event}
            index={index}
            startDate={startDate}
            autoFocus={event.id === focusedEventId}
          />
        ))}
      </ol>
    </div>
  );
}
