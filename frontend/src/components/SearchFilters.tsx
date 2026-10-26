import { useEffect, useState } from "react";
import { formatPrice } from "../api";
import * as sellerApi from "../sellerApi";

export interface FilterValues {
  minPrice?: number;
  maxPrice?: number;
  sellerIds?: string[];
  minRating?: number;
}

interface Props {
  onApply: (filters: FilterValues) => void;
}

const PRICE_MIN = 0;
const PRICE_MAX = 150000;
const PRICE_STEP = 500;

const RATING_OPTIONS = [
  { label: "3★ & up", value: 3 },
  { label: "4★ & up", value: 4 },
  { label: "5★ only", value: 5 },
];

export function SearchFilters({ onApply }: Props) {
  const [sellers, setSellers] = useState<sellerApi.Seller[]>([]);
  const [minPrice, setMinPrice] = useState(PRICE_MIN);
  const [maxPrice, setMaxPrice] = useState(PRICE_MAX);
  const [selectedSellerIds, setSelectedSellerIds] = useState<Set<string>>(new Set());
  const [minRating, setMinRating] = useState<number | undefined>(undefined);

  useEffect(() => {
    sellerApi.listSellers().then(setSellers).catch(() => setSellers([]));
  }, []);

  function toggleSeller(id: string) {
    setSelectedSellerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleMinChange(value: number) {
    setMinPrice(Math.min(value, maxPrice - PRICE_STEP));
  }

  function handleMaxChange(value: number) {
    setMaxPrice(Math.max(value, minPrice + PRICE_STEP));
  }

  function handleApply() {
    onApply({
      minPrice: minPrice > PRICE_MIN ? minPrice : undefined,
      maxPrice: maxPrice < PRICE_MAX ? maxPrice : undefined,
      sellerIds: selectedSellerIds.size > 0 ? Array.from(selectedSellerIds) : undefined,
      minRating,
    });
  }

  function handleClear() {
    setMinPrice(PRICE_MIN);
    setMaxPrice(PRICE_MAX);
    setSelectedSellerIds(new Set());
    setMinRating(undefined);
    onApply({});
  }

  const minPercent = ((minPrice - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100;
  const maxPercent = ((maxPrice - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100;

  return (
    <aside className="filters-sidebar">
      <h3 className="filters-sidebar__title">Filters</h3>

      <div className="filter-section">
        <p className="filter-section__label">Price</p>
        <div className="range-slider">
          <div className="range-slider__track-bg" />
          <div
            className="range-slider__track-fill"
            style={{ left: `${minPercent}%`, right: `${100 - maxPercent}%` }}
          />
          <input
            type="range"
            min={PRICE_MIN}
            max={PRICE_MAX}
            step={PRICE_STEP}
            value={minPrice}
            onChange={(e) => handleMinChange(Number(e.target.value))}
            aria-label="Minimum price"
          />
          <input
            type="range"
            min={PRICE_MIN}
            max={PRICE_MAX}
            step={PRICE_STEP}
            value={maxPrice}
            onChange={(e) => handleMaxChange(Number(e.target.value))}
            aria-label="Maximum price"
          />
        </div>
        <div className="range-slider__values">
          <span>{formatPrice(minPrice)}</span>
          <span>{formatPrice(maxPrice)}{maxPrice >= PRICE_MAX ? "+" : ""}</span>
        </div>
      </div>

      <div className="filter-section">
        <p className="filter-section__label">Brand</p>
        <div className="filter-checkbox-list">
          {sellers.map((s) => (
            <label key={s.sellerId} className="filter-checkbox">
              <input
                type="checkbox"
                checked={selectedSellerIds.has(s.sellerId)}
                onChange={() => toggleSeller(s.sellerId)}
              />
              {s.name}
            </label>
          ))}
        </div>
      </div>

      <div className="filter-section">
        <p className="filter-section__label">Rating</p>
        <div className="filter-checkbox-list">
          {RATING_OPTIONS.map((opt) => (
            <label key={opt.value} className="filter-checkbox">
              <input
                type="checkbox"
                checked={minRating === opt.value}
                onChange={() => setMinRating(minRating === opt.value ? undefined : opt.value)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      <div className="filters-sidebar__actions">
        <button className="pill-button pill-button--block" onClick={handleApply}>
          Apply Filters
        </button>
        <button className="link-button" onClick={handleClear}>
          Clear all
        </button>
      </div>
    </aside>
  );
}
