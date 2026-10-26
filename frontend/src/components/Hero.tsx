import { HERO_IMAGE } from "../categoryMeta";

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
      <img className="hero__image" src={`${HERO_IMAGE}?w=900&h=600&fit=crop&auto=format`} alt="Shopping bags" />
    </section>
  );
}
