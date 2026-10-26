import "dotenv/config";
import pool from "../src/db/pool";

/**
 * Replaces the generic "Test Seller"/"Other Seller" demo data with real
 * brand names as sellers and a 50-product catalog spread across them, to
 * make the search/recommendation demo more realistic (per user request).
 *
 * Sellers are seeded directly via SQL (no seller-creation API exists by
 * design, per readme.txt). Products are created through the REAL seller
 * API (POST /sellers/{id}/products) so this also exercises the actual
 * creation flow at scale rather than inserting rows directly - the
 * backend must be running (default http://localhost:3100) for this to work.
 *
 * Existing buyer users (Test User / Alice / Bob) are left untouched - this
 * script only replaces seller/product/inventory data, plus the user_events
 * that reference the old products (those would otherwise point at deleted
 * products and break the dashboard's Events view).
 *
 * Usage: npm run seed:demo  (from backend/)
 */

const API_BASE = process.env.SEED_API_BASE ?? "http://localhost:3100";

const CATEGORIES = {
  FOOTWEAR: "c0000000-0000-0000-0000-000000000001",
  ELECTRONICS: "c0000000-0000-0000-0000-000000000002",
  APPAREL: "c0000000-0000-0000-0000-000000000003",
  HOME: "c0000000-0000-0000-0000-000000000004",
  ACCESSORIES: "c0000000-0000-0000-0000-000000000005",
};

const SELLERS = {
  NIKE: { id: "50000000-0000-0000-0000-000000000001", name: "Nike" },
  ADIDAS: { id: "50000000-0000-0000-0000-000000000002", name: "Adidas" },
  PUMA: { id: "50000000-0000-0000-0000-000000000003", name: "Puma" },
  APPLE: { id: "50000000-0000-0000-0000-000000000004", name: "Apple" },
  SAMSUNG: { id: "50000000-0000-0000-0000-000000000005", name: "Samsung" },
  SONY: { id: "50000000-0000-0000-0000-000000000006", name: "Sony" },
  LEVIS: { id: "50000000-0000-0000-0000-000000000007", name: "Levi's" },
  IKEA: { id: "50000000-0000-0000-0000-000000000008", name: "IKEA" },
};

interface SeedProduct {
  seller: { id: string; name: string };
  name: string;
  description: string;
  categoryId: string;
  price: number;
  quantity: number;
}

const PRODUCTS: SeedProduct[] = [
  // Nike (8)
  { seller: SELLERS.NIKE, name: "Nike Air Max 90", description: "Classic lifestyle sneaker with visible Air cushioning", categoryId: CATEGORIES.FOOTWEAR, price: 8999, quantity: 25 },
  { seller: SELLERS.NIKE, name: "Nike Air Force 1", description: "Iconic basketball-inspired sneaker", categoryId: CATEGORIES.FOOTWEAR, price: 7499, quantity: 30 },
  { seller: SELLERS.NIKE, name: "Nike Pegasus 40 Running Shoes", description: "Responsive daily trainer for road running", categoryId: CATEGORIES.FOOTWEAR, price: 9999, quantity: 20 },
  { seller: SELLERS.NIKE, name: "Nike Dri-FIT Running T-Shirt", description: "Lightweight sweat-wicking training tee", categoryId: CATEGORIES.APPAREL, price: 1999, quantity: 40 },
  { seller: SELLERS.NIKE, name: "Nike Tech Fleece Hoodie", description: "Premium lightweight fleece hoodie", categoryId: CATEGORIES.APPAREL, price: 4999, quantity: 15 },
  { seller: SELLERS.NIKE, name: "Nike Sportswear Shorts", description: "Everyday knit shorts with side pockets", categoryId: CATEGORIES.APPAREL, price: 1799, quantity: 35 },
  { seller: SELLERS.NIKE, name: "Nike Everyday Crew Socks (3-pack)", description: "Cushioned cotton crew socks", categoryId: CATEGORIES.ACCESSORIES, price: 899, quantity: 50 },
  { seller: SELLERS.NIKE, name: "Nike Backpack", description: "Durable everyday backpack with laptop sleeve", categoryId: CATEGORIES.ACCESSORIES, price: 2499, quantity: 18 },

  // Adidas (7)
  { seller: SELLERS.ADIDAS, name: "Adidas Ultraboost 22", description: "Energy-returning running shoe with Boost midsole", categoryId: CATEGORIES.FOOTWEAR, price: 10999, quantity: 18 },
  { seller: SELLERS.ADIDAS, name: "Adidas Samba OG", description: "Classic leather indoor soccer-inspired sneaker", categoryId: CATEGORIES.FOOTWEAR, price: 7999, quantity: 22 },
  { seller: SELLERS.ADIDAS, name: "Adidas Stan Smith", description: "Timeless minimalist tennis sneaker", categoryId: CATEGORIES.FOOTWEAR, price: 6999, quantity: 28 },
  { seller: SELLERS.ADIDAS, name: "Adidas Tiro Track Jacket", description: "Classic three-stripe track jacket", categoryId: CATEGORIES.APPAREL, price: 3999, quantity: 20 },
  { seller: SELLERS.ADIDAS, name: "Adidas Essentials Hoodie", description: "Soft fleece pullover hoodie", categoryId: CATEGORIES.APPAREL, price: 3499, quantity: 24 },
  { seller: SELLERS.ADIDAS, name: "Adidas 3-Stripes Shorts", description: "Classic training shorts", categoryId: CATEGORIES.APPAREL, price: 1699, quantity: 32 },
  { seller: SELLERS.ADIDAS, name: "Adidas Duffel Bag", description: "Spacious gym duffel bag", categoryId: CATEGORIES.ACCESSORIES, price: 2999, quantity: 16 },

  // Puma (6)
  { seller: SELLERS.PUMA, name: "Puma RS-X", description: "Chunky retro-inspired running shoe", categoryId: CATEGORIES.FOOTWEAR, price: 6499, quantity: 20 },
  { seller: SELLERS.PUMA, name: "Puma Suede Classic", description: "Iconic suede sneaker since 1968", categoryId: CATEGORIES.FOOTWEAR, price: 5999, quantity: 26 },
  { seller: SELLERS.PUMA, name: "Puma Velocity Nitro 2 Running Shoes", description: "Nitro-foam cushioned performance runner", categoryId: CATEGORIES.FOOTWEAR, price: 7999, quantity: 14 },
  { seller: SELLERS.PUMA, name: "Puma Essential Logo T-Shirt", description: "Cotton tee with classic Puma logo", categoryId: CATEGORIES.APPAREL, price: 1299, quantity: 45 },
  { seller: SELLERS.PUMA, name: "Puma Fleece Sweatpants", description: "Relaxed-fit fleece joggers", categoryId: CATEGORIES.APPAREL, price: 2199, quantity: 22 },
  { seller: SELLERS.PUMA, name: "Puma Cap", description: "Adjustable cotton baseball cap", categoryId: CATEGORIES.ACCESSORIES, price: 899, quantity: 38 },

  // Apple (7)
  { seller: SELLERS.APPLE, name: "iPhone 15", description: "6.1-inch display, A16 Bionic chip", categoryId: CATEGORIES.ELECTRONICS, price: 79900, quantity: 12 },
  { seller: SELLERS.APPLE, name: "iPhone 15 Pro", description: "Titanium design, A17 Pro chip", categoryId: CATEGORIES.ELECTRONICS, price: 134900, quantity: 0 },
  { seller: SELLERS.APPLE, name: "iPad Air", description: "10.9-inch Liquid Retina display, M1 chip", categoryId: CATEGORIES.ELECTRONICS, price: 59900, quantity: 15 },
  { seller: SELLERS.APPLE, name: "MacBook Air M3", description: "13-inch, M3 chip, all-day battery life", categoryId: CATEGORIES.ELECTRONICS, price: 114900, quantity: 9 },
  { seller: SELLERS.APPLE, name: "AirPods Pro (2nd Gen)", description: "Active Noise Cancellation, USB-C", categoryId: CATEGORIES.ELECTRONICS, price: 24900, quantity: 30 },
  { seller: SELLERS.APPLE, name: "Apple Watch Series 9", description: "Always-On Retina display, S9 chip", categoryId: CATEGORIES.ELECTRONICS, price: 41900, quantity: 18 },
  { seller: SELLERS.APPLE, name: "Mac Mini M2", description: "Compact desktop, M2 chip", categoryId: CATEGORIES.ELECTRONICS, price: 64900, quantity: 10 },

  // Samsung (7)
  { seller: SELLERS.SAMSUNG, name: "Samsung Galaxy S24", description: "6.2-inch Dynamic AMOLED, Galaxy AI", categoryId: CATEGORIES.ELECTRONICS, price: 74999, quantity: 14 },
  { seller: SELLERS.SAMSUNG, name: "Samsung Galaxy S24 Ultra", description: "6.8-inch display, S Pen, 200MP camera", categoryId: CATEGORIES.ELECTRONICS, price: 129999, quantity: 8 },
  { seller: SELLERS.SAMSUNG, name: "Samsung Galaxy Tab S9", description: "11-inch AMOLED tablet with S Pen", categoryId: CATEGORIES.ELECTRONICS, price: 62999, quantity: 11 },
  { seller: SELLERS.SAMSUNG, name: "Samsung Galaxy Watch 6", description: "Advanced sleep coaching, BIA sensor", categoryId: CATEGORIES.ELECTRONICS, price: 28999, quantity: 20 },
  { seller: SELLERS.SAMSUNG, name: "Samsung Galaxy Buds2 Pro", description: "Intelligent ANC true wireless earbuds", categoryId: CATEGORIES.ELECTRONICS, price: 17999, quantity: 26 },
  { seller: SELLERS.SAMSUNG, name: "Samsung 55-inch Neo QLED TV", description: "4K Neo QLED with Quantum Matrix Technology", categoryId: CATEGORIES.ELECTRONICS, price: 134999, quantity: 5 },
  { seller: SELLERS.SAMSUNG, name: "Samsung Galaxy Z Flip5", description: "Foldable smartphone with Flex Window", categoryId: CATEGORIES.ELECTRONICS, price: 99999, quantity: 7 },

  // Sony (7)
  { seller: SELLERS.SONY, name: "Sony WH-1000XM5 Headphones", description: "Industry-leading noise cancelling headphones", categoryId: CATEGORIES.ELECTRONICS, price: 29990, quantity: 22 },
  { seller: SELLERS.SONY, name: "Sony PlayStation 5", description: "Next-gen gaming console", categoryId: CATEGORIES.ELECTRONICS, price: 54990, quantity: 0 },
  { seller: SELLERS.SONY, name: "Sony Alpha a6400 Camera", description: "Mirrorless APS-C camera with fast autofocus", categoryId: CATEGORIES.ELECTRONICS, price: 74990, quantity: 9 },
  { seller: SELLERS.SONY, name: "Sony SRS-XB13 Bluetooth Speaker", description: "Compact portable party speaker", categoryId: CATEGORIES.ELECTRONICS, price: 2999, quantity: 40 },
  { seller: SELLERS.SONY, name: "Sony Bravia 65-inch 4K TV", description: "4K HDR OLED television", categoryId: CATEGORIES.ELECTRONICS, price: 109990, quantity: 6 },
  { seller: SELLERS.SONY, name: "Sony WF-C700N Earbuds", description: "Compact noise cancelling earbuds", categoryId: CATEGORIES.ELECTRONICS, price: 8990, quantity: 28 },
  { seller: SELLERS.SONY, name: "Sony PlayStation 5 DualSense Controller", description: "Wireless controller with haptic feedback", categoryId: CATEGORIES.ELECTRONICS, price: 5990, quantity: 17 },

  // Levi's (4)
  { seller: SELLERS.LEVIS, name: "Levi's 501 Original Jeans", description: "The original straight fit blue jean", categoryId: CATEGORIES.APPAREL, price: 4999, quantity: 24 },
  { seller: SELLERS.LEVIS, name: "Levi's Trucker Jacket", description: "Classic denim trucker jacket", categoryId: CATEGORIES.APPAREL, price: 5999, quantity: 16 },
  { seller: SELLERS.LEVIS, name: "Levi's Classic Fit T-Shirt", description: "Soft cotton crew neck tee", categoryId: CATEGORIES.APPAREL, price: 1499, quantity: 36 },
  { seller: SELLERS.LEVIS, name: "Levi's Denim Shirt", description: "Lightweight everyday denim shirt", categoryId: CATEGORIES.APPAREL, price: 2999, quantity: 20 },

  // IKEA (4)
  { seller: SELLERS.IKEA, name: "IKEA MALM Bed Frame", description: "Veneer bed frame with clean lines", categoryId: CATEGORIES.HOME, price: 17999, quantity: 6 },
  { seller: SELLERS.IKEA, name: "IKEA POÄNG Armchair", description: "Layer-glued bent birch armchair", categoryId: CATEGORIES.HOME, price: 8999, quantity: 10 },
  { seller: SELLERS.IKEA, name: "IKEA KALLAX Shelf Unit", description: "Versatile 4x4 cube storage shelf", categoryId: CATEGORIES.HOME, price: 6999, quantity: 13 },
  { seller: SELLERS.IKEA, name: "IKEA FOTO Table Lamp", description: "Adjustable metal table lamp", categoryId: CATEGORIES.HOME, price: 1499, quantity: 25 },
];

async function clearExistingData() {
  await pool.query("DELETE FROM user_events");
  await pool.query("DELETE FROM inventory");
  await pool.query("DELETE FROM products");
  await pool.query("DELETE FROM sellers");
  console.log("Cleared existing sellers, products, inventory, and user_events (buyer users left intact).");
}

async function seedSellers() {
  for (const seller of Object.values(SELLERS)) {
    await pool.query(`INSERT INTO sellers (seller_id, name, status) VALUES ($1, $2, 'ACTIVE')`, [
      seller.id,
      seller.name,
    ]);
  }
  console.log(`Seeded ${Object.keys(SELLERS).length} brand sellers.`);
}

async function seedProducts() {
  let created = 0;
  for (const product of PRODUCTS) {
    const res = await fetch(`${API_BASE}/sellers/${product.seller.id}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: product.name,
        description: product.description,
        categoryId: product.categoryId,
        price: product.price,
        quantity: product.quantity,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(`Failed to create "${product.name}": ${res.status} ${JSON.stringify(body)}`);
    }
    created++;
  }
  console.log(`Created ${created} products via the real seller API (${API_BASE}).`);
}

async function main() {
  await clearExistingData();
  await seedSellers();
  await seedProducts();
  await pool.end();
  console.log("Demo data seed complete.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
