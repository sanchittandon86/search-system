export interface Seller {
  sellerId: string;
  name: string;
  status: "ACTIVE" | "SUSPENDED";
  createdAt: Date;
}
