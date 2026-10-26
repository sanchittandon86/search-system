import { FormEvent, useState } from "react";
import { SearchParams } from "../api";

interface Props {
  onSearch: (params: SearchParams) => void;
}

export function SearchBar({ onSearch }: Props) {
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState<SearchParams["sortBy"]>("relevance");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSearch({ q: q.trim() || undefined, sortBy });
  }

  return (
    <form className="search-bar" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Search products (e.g. running shoes)…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SearchParams["sortBy"])}>
        <option value="relevance">Relevance</option>
        <option value="price_asc">Price: Low to High</option>
        <option value="price_desc">Price: High to Low</option>
      </select>
      <button type="submit">Search</button>
    </form>
  );
}
