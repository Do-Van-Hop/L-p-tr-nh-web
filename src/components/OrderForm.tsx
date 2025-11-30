// OrderForm.tsx
import React, { useEffect, useState } from "react";
import { FaPlus, FaTrash, FaSpinner } from "react-icons/fa";
import { v4 as uuidv4 } from "uuid";
import "./order.css"; // ensure you import the css file

// --- Types (loose, defensive) ---
export interface OrderItem {
  id: string;
  product_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_name?: string;
  product_sku?: string;
}

export interface OrderItemPayload {
  product_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface OrderFormData {
  customer_id: number | null;
  items: OrderItemPayload[];
  subtotal: number;
  final_amount: number;
  note?: string;
  payment_status: string;
  order_status: string;
}

interface OrderFormProps {
  onSubmit: (data: OrderFormData) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

interface ProductRaw {
  // whatever backend returns
  id?: number;
  product_id?: number;
  name?: string;
  sku?: string;
  price?: number;
  unit_price?: number;
  unitPrice?: number;
  stock_quantity: number;
}

interface ProductNormalized {
  product_id: number;
  name: string;
  sku?: string;
  unit_price: number;
  stock_quantity: number;
}

interface CustomerRaw {
  customer_id?: number;
  id?: number;
  name?: string;
}

const toNumberSafe = (v: any, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const normalizeProducts = (arr: ProductRaw[]): ProductNormalized[] => {
  return (arr || []).map(p => {
    const id = p.product_id ?? p.id ?? 0;
    const unit_price = p.unit_price ?? p.price ?? p.unitPrice ?? 0;
    const stock_quantity = toNumberSafe(p.stock_quantity ?? 0, 0); // lấy từ backend
    return {
      product_id: toNumberSafe(id, 0),
      name: p.name ?? "Unknown",
      sku: p.sku,
      unit_price: toNumberSafe(unit_price, 0),
      stock_quantity,
    };
  });
};

const normalizeCustomers = (arr: CustomerRaw[]) =>
  (arr || []).map(c => ({
    customer_id: toNumberSafe(c.customer_id ?? c.id, 0),
    name: c.name ?? "Unknown",
  }));

const OrderForm: React.FC<OrderFormProps> = ({ onSubmit, onCancel, loading }) => {
  const [customerId, setCustomerId] = useState<number | undefined>(undefined);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [products, setProducts] = useState<ProductNormalized[]>([]);
  const [customers, setCustomers] = useState<{ customer_id: number; name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState("");
  const [subtotal, setSubtotal] = useState<number>(0);

  // load products
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const fetchProducts = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/products", {
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
            "Cache-Control": "no-cache",
          },
        });

        if (!res.ok) {
          console.error("Fetch products failed", res.status);
          const text = await res.text().catch(() => "");
          console.error("body:", text);
          return;
        }

        const data = await res.json().catch(() => ({}));
        // backend may return { data: [...] } or [...]
        const raw = Array.isArray(data) ? data : data.data ?? [];
        const norm = normalizeProducts(raw);
        setProducts(norm);

        console.log("Products loaded:", norm);
      } catch (err) {
        console.error("Error loading products:", err);
      }
    };

    fetchProducts();
  }, []);

  // load customers
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const fetchCustomers = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/customers?page=1&limit=200", {
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
            "Cache-Control": "no-cache",
          },
        });

        if (!res.ok) {
          console.error("Fetch customers failed", res.status);
          return;
        }

        const data = await res.json().catch(() => ({}));
        const raw = Array.isArray(data) ? data : data.data ?? [];
        setCustomers(normalizeCustomers(raw));
      } catch (err) {
        console.error("Error loading customers:", err);
      }
    };

    fetchCustomers();
  }, []);


  useEffect(() => {
    const s = items.reduce((acc, it) => acc + toNumberSafe(it.total_price, 0), 0);
    setSubtotal(s);
  }, [items]);

 
  const handleAddItem = () => {
    if (!products || products.length === 0) {
      alert("Chưa có sản phẩm trong hệ thống");
      return;
    }
    const p = products[0];
    const newItem: OrderItem = {
      id: uuidv4(),
      product_id: p.product_id,
      quantity: 1,
      unit_price: toNumberSafe(p.unit_price, 0),
      total_price: toNumberSafe(p.unit_price, 0),
      product_name: p.name,
      product_sku: p.sku,
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleRemoveItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

 const handleItemChange = (id: string, field: "product_id" | "quantity", rawValue: any) => {
  setItems(prev =>
    prev.map(item => {
      if (item.id !== id) return item;
      const copy = { ...item };

      if (field === "product_id") {
        const chosen = products.find(p => p.product_id === toNumberSafe(rawValue, -1));
        if (chosen) {
          copy.product_id = chosen.product_id;
          copy.product_name = chosen.name;
          copy.product_sku = chosen.sku;
          copy.unit_price = toNumberSafe(chosen.unit_price, 0);
          // số lượng hiện tại nhưng không vượt quá tồn kho
          copy.quantity = Math.min(copy.quantity || 1, chosen.stock_quantity);
          copy.total_price = copy.unit_price * copy.quantity;
        } else {
          copy.product_id = toNumberSafe(rawValue, 0);
          copy.unit_price = 0;
          copy.total_price = 0;
        }
      } else if (field === "quantity") {
        const chosen = products.find(p => p.product_id === copy.product_id);
        const qty = Math.max(1, Math.min(toNumberSafe(rawValue, 1), chosen?.stock_quantity ?? Infinity));
        copy.quantity = qty;
        copy.total_price = copy.unit_price * qty;
      }

      return copy;
    })
  );
};

  // build payload and submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!items.length) {
      alert("Vui lòng thêm ít nhất 1 sản phẩm");
      return;
    }

    setSubmitting(true);
    try {
      // ensure all items valid
      const payloadItems: OrderItemPayload[] = items.map(it => ({
        product_id: toNumberSafe(it.product_id, 0),
        quantity: Math.max(1, toNumberSafe(it.quantity, 1)),
        unit_price: toNumberSafe(it.unit_price, 0),
        total_price: toNumberSafe(it.total_price, 0),
      }));

     const payload: OrderFormData = {
  customer_id: customerId ?? null,  // nếu khách vãng lai
  items: items.map(it => ({
    product_id: toNumberSafe(it.product_id, 0),
    quantity: Math.max(1, toNumberSafe(it.quantity, 1)),
    unit_price: toNumberSafe(it.unit_price, 0),
    total_price: toNumberSafe(it.total_price, 0),
  })),
   subtotal: subtotal || 0,       // chắc chắn là number
  final_amount: subtotal || 0, // luôn là number
  note: note ?? null,                        // tránh undefined
  payment_status: "pending",
  order_status: "draft",
};


      console.log("Submitting payload:", payload);
      await onSubmit(payload);
      // reset after success
      setItems([]);
      setCustomerId(undefined);
      setNote("");
    } catch (err: any) {
      console.error("Create order error:", err);
      const msg = err?.message ?? "Lỗi server khi tạo đơn hàng";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(toNumberSafe(n, 0));

  return (
    <div className="order-form-wrapper">
      <form onSubmit={handleSubmit} className="order-form">
        <div className="form-row">
          <div className="form-group">
            <label>Chọn khách hàng</label>
            <select
              value={customerId ?? ""}
              onChange={e => {
                const v = e.target.value;
                setCustomerId(v === "" ? undefined : toNumberSafe(v, undefined));
              }}
              disabled={loading || submitting}
            >
              <option value="">-- Khách vãng lai --</option>
              {customers.map(c => (
                <option key={c.customer_id} value={c.customer_id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Ghi chú</label>
            <input value={note} onChange={e => setNote(e.target.value)} disabled={loading || submitting} />
          </div>
        </div>

        <div className="order-items-header">
          <h4>Sản phẩm</h4>
          <button type="button" onClick={handleAddItem} disabled={loading || submitting || products.length === 0}>
            <FaPlus /> Thêm sản phẩm
          </button>
        </div>

        <div className="order-items-scroll">
          {items.map(item => (
            <div className="order-item-row" key={item.id}>
              <select
                value={item.product_id}
                onChange={e => handleItemChange(item.id, "product_id", Number(e.target.value))}
                disabled={loading || submitting}
              >
                {products.map(p => (
                  <option key={p.product_id} value={p.product_id}>
                    {p.name} ({p.sku ?? "N/A"}) - {formatCurrency(p.unit_price)} - Tồn kho: {p.stock_quantity}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min={1}
                value={item.quantity}
                onChange={e => handleItemChange(item.id, "quantity", Number(e.target.value))}
                disabled={loading || submitting}
              />

              <div className="price">{formatCurrency(item.total_price)}</div>

              <button type="button" onClick={() => handleRemoveItem(item.id)} disabled={loading || submitting}>
                <FaTrash />
              </button>
            </div>
          ))}

          {items.length === 0 && <div className="empty-note">Chưa có sản phẩm. Bấm "Thêm sản phẩm" để bắt đầu.</div>}
        </div>

        <div className="order-summary">
          <div>Tổng cộng: <strong>{formatCurrency(subtotal)}</strong></div>
        </div>

        <div className="form-actions">
          <button type="button" onClick={onCancel} disabled={loading || submitting}>
            Hủy
          </button>
          <button type="submit" disabled={loading || submitting}>
            {submitting ? <><FaSpinner className="spinner-small" /> Đang xử lý...</> : "Tạo đơn hàng"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default OrderForm;
