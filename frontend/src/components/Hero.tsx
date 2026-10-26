interface Props {
  onExplore: () => void;
}

export function Hero({ onExplore }: Props) {
  return (
    <section className="hero">
      <div className="hero__text">
        <h1>New Arrivals</h1>
        <p>Shop the latest collection.</p>
        <button className="hero__cta" onClick={onExplore}>
          Explore Now
        </button>
      </div>
      <div className="hero__image" aria-hidden="true" />
    </section>
  );
}
