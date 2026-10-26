import { FormEvent, useState } from "react";
import { CreateProductInput } from "../../sellerApi";

interface Props {
  onClose: () => void;
  onCreate: (input: CreateProductInput) => Promise<void>;
}

export function AddProductModal({ onClose, onCreate }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const priceNum = Number(price);
    if (!name.trim() || !priceNum || priceNum <= 0) {
      setError("Name and a price greater than 0 are required");
      return;
    }
    setSaving(true);
    try {
      await onCreate({
        name: name.trim(),
        description: description.trim() || undefined,
        price: priceNum,
        quantity: quantity ? Number(quantity) : undefined,
      });
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
        <h2>Add Product</h2>
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
            Initial stock quantity
            <input type="number" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={saving}>
            {saving ? "Creating…" : "Create Product"}
          </button>
        </form>
      </div>
    </div>
  );
}
