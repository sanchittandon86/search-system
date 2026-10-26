import { FormEvent } from "react";
import { SearchParams } from "../api";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSearch: (params: SearchParams) => void;
}

export function SearchBar({ value, onChange, onSearch }: Props) {
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // Relevance (the black box's own ranking) is always the default -
    // there's no sort override in the UI anymore.
    onSearch({ q: value.trim() || undefined, sortBy: "relevance" });
  }

  function handleClear() {
    onChange("");
    onSearch({ q: undefined, sortBy: "relevance" });
  }

  return (
    <form className="search-bar" onSubmit={handleSubmit}>
      <div className="search-bar__input-wrap">
        <input
          type="text"
          placeholder="Search products (e.g. running shoes)…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {value && (
          <button
            type="button"
            className="search-bar__clear"
            onClick={handleClear}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>
      <button type="submit">Search</button>
    </form>
  );
}
