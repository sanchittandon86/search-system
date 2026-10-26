export interface InventoryUpdateInput {
  quantity?: number;
  delta?: number;
}

export interface Inventory {
  productId: string;
  quantity: number;
  updatedAt: Date;
}
