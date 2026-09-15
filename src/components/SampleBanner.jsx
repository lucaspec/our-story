export default function SampleBanner() {
  return (
    <div className="sample-banner">
      <span className="sample-banner__pin" aria-hidden="true" />
      <p>
        Showing sample dates. Run <code>npm run import-photos</code> with your Google Takeout
        export to load your real timeline.
      </p>
    </div>
  );
}
