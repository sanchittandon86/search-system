import { FormEvent, useState } from "react";
import { Product } from "../../types";

interface Props {
  product: Product;
  onClose: () => void;
  onSave: (updates: { name?: string; description?: string; price?: number; isActive?: boolean }, quantity: number) => Promise<void>;
}

export function EditProductModal({ product, onClose, onSave }: Props) {
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description ?? "");
  const [price, setPrice] = useState(String(product.price));
  const [isActive, setIsActive] = useState(product.isActive);
  const [quantity, setQuantity] = useState(String(product.quantity));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const priceNum = Number(price);
    const quantityNum = Number(quantity);
    if (!name.trim() || !priceNum || priceNum <= 0) {
      setError("Name and a price greater than 0 are required");
      return;
    }
    if (quantityNum < 0) {
      setError("Quantity must be >= 0");
      return;
    }
    setSaving(true);
    try {
      await onSave(
        {
          name: name.trim(),
          description: description.trim() || undefined,
          price: priceNum,
          isActive,
        },
        quantityNum
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal__close" onClick={onClose}>
          ×
        </button>
        <h2>Edit Product</h2>
        <form className="dash-form" onSubmit={handleSubmit}>
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            Description
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </label>
          <label>
            Price
            <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
          </label>
          <label>
            Stock quantity
            <input type="number" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </label>
          <label className="dash-form__checkbox">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active (visible in search)
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
