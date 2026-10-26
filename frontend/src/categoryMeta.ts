// Maps the 5 category UUIDs from backend/scripts/seed-demo-data.ts to a
// display label and one representative stock photo per category. There is
// no image field or upload system in this project (out of scope), so this
// is a deliberate, honest simplification: every product in a category
// shares that category's photo, rather than fabricating per-SKU
// photography that doesn't exist. Sourced from Unsplash's public CDN.

interface CategoryMeta {
  label: string;
  image: string;
}

const CATEGORY_META: Record<string, CategoryMeta> = {
  "c0000000-0000-0000-0000-000000000001": {
    label: "Footwear",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff",
  },
  "c0000000-0000-0000-0000-000000000002": {
    label: "Electronics",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e",
  },
  "c0000000-0000-0000-0000-000000000003": {
    label: "Apparel",
    image: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f",
  },
  "c0000000-0000-0000-0000-000000000004": {
    label: "Home",
    image: "https://images.unsplash.com/photo-1540932239986-30128078f3c5",
  },
  "c0000000-0000-0000-0000-000000000005": {
    label: "Accessories",
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62",
  },
};

const FALLBACK: CategoryMeta = {
  label: "Uncategorized",
  image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30",
};

// Generic e-commerce/shopping imagery for the hero banner - not tied to any
// single category since the catalog spans footwear, electronics, apparel,
// home, and accessories.
export const HERO_IMAGE = "https://images.unsplash.com/photo-1441986300917-64674bd600d8";

export function getCategoryMeta(categoryId: string | null): CategoryMeta {
  if (!categoryId) return FALLBACK;
  return CATEGORY_META[categoryId] ?? FALLBACK;
}

export function categoryImageUrl(categoryId: string | null, size = 400): string {
  const meta = getCategoryMeta(categoryId);
  return `${meta.image}?w=${size}&h=${size}&fit=crop&auto=format`;
}
