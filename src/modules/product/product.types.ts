export interface Product {
  productId: string;
  sellerId: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  price: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductWithInventory extends Product {
  quantity: number;
}

export interface CreateProductInput {
  name: string;
  description?: string;
  categoryId?: string;
  price: number;
  quantity?: number;
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  categoryId?: string;
  price?: number;
  isActive?: boolean;
}
