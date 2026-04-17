import { useEffect, useState } from "react";
import {
  createInventory,
  createOrder,
  createProduct,
  createSupplier,
  deleteInventory,
  deleteOrder,
  deleteProduct,
  deleteSupplier,
  listInventory,
  listOrders,
  listProducts,
  listSuppliers,
  updateInventory,
  updateOrder,
  updateProduct,
  updateSupplier,
} from "../lib/api";

const emptyProduct = { sku: "", name: "", category: "general", description: "", unit_price: 25, active: true };
const emptySupplier = { name: "", supplier_type: "local", lead_time_days: 2, unit_cost: 10, reliability_score: 0.95, active: true };
const emptyInventory = { product_id: 1, location_type: "central", location_name: "", on_hand: 0, backlog: 0, in_transit: 0, reorder_point: 50, safety_stock: 25 };
const emptyOrder = { product_id: 1, supplier_id: 1, order_type: "order", status: "planned", quantity: 0, unit_cost: 0, source_location: "supplier", destination_location: "central", expected_arrival: "" };

function EntitySection({ title, copy, children }) {
  return (
    <section className="panel">
      <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{copy}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function FormRow({ children }) {
  return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{children}</div>;
}

function EntityTable({ columns, rows, onEdit, onDelete }) {
  return (
    <div className="table-shell">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((column) => (
                <td key={column}>{String(row[column] ?? "")}</td>
              ))}
              <td className="space-x-2">
                <button className="button-secondary !px-3 !py-2" onClick={() => onEdit(row)}>Edit</button>
                <button className="button-secondary !px-3 !py-2" onClick={() => onDelete(row.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function InventoryManagementPage() {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [orders, setOrders] = useState([]);
  const [productForm, setProductForm] = useState(emptyProduct);
  const [supplierForm, setSupplierForm] = useState(emptySupplier);
  const [inventoryForm, setInventoryForm] = useState(emptyInventory);
  const [orderForm, setOrderForm] = useState(emptyOrder);
  const [editing, setEditing] = useState({ product: null, supplier: null, inventory: null, order: null });
  const [status, setStatus] = useState("");

  async function loadAll() {
    const [nextProducts, nextSuppliers, nextInventory, nextOrders] = await Promise.all([
      listProducts(),
      listSuppliers(),
      listInventory(),
      listOrders(),
    ]);
    setProducts(nextProducts);
    setSuppliers(nextSuppliers);
    setInventory(nextInventory);
    setOrders(nextOrders);
    if (nextProducts[0]) {
      setInventoryForm((current) => ({ ...current, product_id: current.product_id || nextProducts[0].id }));
      setOrderForm((current) => ({ ...current, product_id: current.product_id || nextProducts[0].id }));
    }
    if (nextSuppliers[0]) {
      setOrderForm((current) => ({ ...current, supplier_id: current.supplier_id || nextSuppliers[0].id }));
    }
  }

  useEffect(() => {
    loadAll().catch((error) => setStatus(error.message));
  }, []);

  async function submitProduct(event) {
    event.preventDefault();
    if (editing.product) {
      await updateProduct(editing.product, productForm);
      setEditing((current) => ({ ...current, product: null }));
    } else {
      await createProduct(productForm);
    }
    setProductForm(emptyProduct);
    setStatus("Product catalog updated.");
    loadAll();
  }

  async function submitSupplier(event) {
    event.preventDefault();
    if (editing.supplier) {
      await updateSupplier(editing.supplier, supplierForm);
      setEditing((current) => ({ ...current, supplier: null }));
    } else {
      await createSupplier(supplierForm);
    }
    setSupplierForm(emptySupplier);
    setStatus("Supplier record saved.");
    loadAll();
  }

  async function submitInventory(event) {
    event.preventDefault();
    const payload = { ...inventoryForm, product_id: Number(inventoryForm.product_id) };
    if (editing.inventory) {
      await updateInventory(editing.inventory, payload);
      setEditing((current) => ({ ...current, inventory: null }));
    } else {
      await createInventory(payload);
    }
    setInventoryForm(emptyInventory);
    setStatus("Inventory position updated.");
    loadAll();
  }

  async function submitOrder(event) {
    event.preventDefault();
    const payload = {
      ...orderForm,
      product_id: Number(orderForm.product_id),
      supplier_id: orderForm.supplier_id ? Number(orderForm.supplier_id) : null,
      expected_arrival: orderForm.expected_arrival || null,
    };
    if (editing.order) {
      await updateOrder(editing.order, payload);
      setEditing((current) => ({ ...current, order: null }));
    } else {
      await createOrder(payload);
    }
    setOrderForm(emptyOrder);
    setStatus("Order or shipment record saved.");
    loadAll();
  }

  return (
    <div className="space-y-6">
      <section className="panel overflow-hidden">
        <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
          <div>
            <h1 className="section-title">Inventory Management</h1>
            <p className="section-copy">
              Manage the transactional layer feeding the RL decision engine: product master data, supplier network, stock positions, and planned orders.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="metric-card">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Products</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{products.length}</p>
            </div>
            <div className="metric-card">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Open Records</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{inventory.length + orders.length}</p>
            </div>
          </div>
        </div>
        {status ? <p className="mt-4 rounded-2xl bg-[var(--accent-soft)] px-4 py-3 text-sm text-slate-700">{status}</p> : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <EntitySection title="Products" copy="CRUD for the SKU catalog that planners and simulation runs reference.">
          <form className="space-y-3" onSubmit={submitProduct}>
            <FormRow>
              <input className="input" placeholder="SKU" value={productForm.sku} onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })} />
              <input className="input" placeholder="Name" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} />
              <input className="input" placeholder="Category" value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })} />
              <input className="input" type="number" placeholder="Unit price" value={productForm.unit_price} onChange={(e) => setProductForm({ ...productForm, unit_price: Number(e.target.value) })} />
            </FormRow>
            <input className="input" placeholder="Description" value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} />
            <button className="button-primary" type="submit">{editing.product ? "Update product" : "Create product"}</button>
          </form>
          <div className="mt-5">
            <EntityTable
              columns={["sku", "name", "category", "unit_price"]}
              rows={products}
              onEdit={(row) => {
                setEditing((current) => ({ ...current, product: row.id }));
                setProductForm(row);
              }}
              onDelete={async (id) => {
                await deleteProduct(id);
                loadAll();
              }}
            />
          </div>
        </EntitySection>

        <EntitySection title="Suppliers" copy="Maintain sourcing options so the model can recommend local versus overseas procurement.">
          <form className="space-y-3" onSubmit={submitSupplier}>
            <FormRow>
              <input className="input" placeholder="Supplier name" value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} />
              <select className="input" value={supplierForm.supplier_type} onChange={(e) => setSupplierForm({ ...supplierForm, supplier_type: e.target.value })}>
                <option value="local">Local</option>
                <option value="overseas">Overseas</option>
              </select>
              <input className="input" type="number" placeholder="Lead time" value={supplierForm.lead_time_days} onChange={(e) => setSupplierForm({ ...supplierForm, lead_time_days: Number(e.target.value) })} />
              <input className="input" type="number" step="0.01" placeholder="Unit cost" value={supplierForm.unit_cost} onChange={(e) => setSupplierForm({ ...supplierForm, unit_cost: Number(e.target.value) })} />
            </FormRow>
            <input className="input" type="number" step="0.01" max="1" min="0" placeholder="Reliability score" value={supplierForm.reliability_score} onChange={(e) => setSupplierForm({ ...supplierForm, reliability_score: Number(e.target.value) })} />
            <button className="button-primary" type="submit">{editing.supplier ? "Update supplier" : "Create supplier"}</button>
          </form>
          <div className="mt-5">
            <EntityTable
              columns={["name", "supplier_type", "lead_time_days", "unit_cost"]}
              rows={suppliers}
              onEdit={(row) => {
                setEditing((current) => ({ ...current, supplier: row.id }));
                setSupplierForm(row);
              }}
              onDelete={async (id) => {
                await deleteSupplier(id);
                loadAll();
              }}
            />
          </div>
        </EntitySection>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <EntitySection title="Inventory Positions" copy="Track central and regional stock, backlog, and transit buffers that feed the simulator state.">
          <form className="space-y-3" onSubmit={submitInventory}>
            <FormRow>
              <select className="input" value={inventoryForm.product_id} onChange={(e) => setInventoryForm({ ...inventoryForm, product_id: Number(e.target.value) })}>
                {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
              </select>
              <select className="input" value={inventoryForm.location_type} onChange={(e) => setInventoryForm({ ...inventoryForm, location_type: e.target.value })}>
                <option value="central">Central</option>
                <option value="regional">Regional</option>
              </select>
              <input className="input" placeholder="Location name" value={inventoryForm.location_name} onChange={(e) => setInventoryForm({ ...inventoryForm, location_name: e.target.value })} />
              <input className="input" type="number" placeholder="On hand" value={inventoryForm.on_hand} onChange={(e) => setInventoryForm({ ...inventoryForm, on_hand: Number(e.target.value) })} />
            </FormRow>
            <FormRow>
              <input className="input" type="number" placeholder="Backlog" value={inventoryForm.backlog} onChange={(e) => setInventoryForm({ ...inventoryForm, backlog: Number(e.target.value) })} />
              <input className="input" type="number" placeholder="In transit" value={inventoryForm.in_transit} onChange={(e) => setInventoryForm({ ...inventoryForm, in_transit: Number(e.target.value) })} />
              <input className="input" type="number" placeholder="Reorder point" value={inventoryForm.reorder_point} onChange={(e) => setInventoryForm({ ...inventoryForm, reorder_point: Number(e.target.value) })} />
              <input className="input" type="number" placeholder="Safety stock" value={inventoryForm.safety_stock} onChange={(e) => setInventoryForm({ ...inventoryForm, safety_stock: Number(e.target.value) })} />
            </FormRow>
            <button className="button-primary" type="submit">{editing.inventory ? "Update inventory" : "Create inventory record"}</button>
          </form>
          <div className="mt-5">
            <EntityTable
              columns={["product_id", "location_type", "location_name", "on_hand", "backlog"]}
              rows={inventory}
              onEdit={(row) => {
                setEditing((current) => ({ ...current, inventory: row.id }));
                setInventoryForm(row);
              }}
              onDelete={async (id) => {
                await deleteInventory(id);
                loadAll();
              }}
            />
          </div>
        </EntitySection>

        <EntitySection title="Orders & Shipments" copy="Capture replenishment, transfers, expedites, and shipment status changes from planners.">
          <form className="space-y-3" onSubmit={submitOrder}>
            <FormRow>
              <select className="input" value={orderForm.product_id} onChange={(e) => setOrderForm({ ...orderForm, product_id: Number(e.target.value) })}>
                {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
              </select>
              <select className="input" value={orderForm.supplier_id || ""} onChange={(e) => setOrderForm({ ...orderForm, supplier_id: e.target.value ? Number(e.target.value) : null })}>
                <option value="">No supplier</option>
                {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
              </select>
              <select className="input" value={orderForm.order_type} onChange={(e) => setOrderForm({ ...orderForm, order_type: e.target.value })}>
                <option value="order">Order</option>
                <option value="transfer">Transfer</option>
                <option value="expedite">Expedite</option>
                <option value="discount">Discount</option>
              </select>
              <select className="input" value={orderForm.status} onChange={(e) => setOrderForm({ ...orderForm, status: e.target.value })}>
                <option value="planned">Planned</option>
                <option value="in_transit">In transit</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </FormRow>
            <FormRow>
              <input className="input" type="number" placeholder="Quantity" value={orderForm.quantity} onChange={(e) => setOrderForm({ ...orderForm, quantity: Number(e.target.value) })} />
              <input className="input" type="number" step="0.01" placeholder="Unit cost" value={orderForm.unit_cost} onChange={(e) => setOrderForm({ ...orderForm, unit_cost: Number(e.target.value) })} />
              <input className="input" placeholder="Source" value={orderForm.source_location} onChange={(e) => setOrderForm({ ...orderForm, source_location: e.target.value })} />
              <input className="input" placeholder="Destination" value={orderForm.destination_location} onChange={(e) => setOrderForm({ ...orderForm, destination_location: e.target.value })} />
            </FormRow>
            <input className="input" type="datetime-local" value={orderForm.expected_arrival} onChange={(e) => setOrderForm({ ...orderForm, expected_arrival: e.target.value })} />
            <button className="button-primary" type="submit">{editing.order ? "Update shipment" : "Create shipment"}</button>
          </form>
          <div className="mt-5">
            <EntityTable
              columns={["order_type", "status", "quantity", "destination_location"]}
              rows={orders}
              onEdit={(row) => {
                setEditing((current) => ({ ...current, order: row.id }));
                setOrderForm({ ...row, expected_arrival: row.expected_arrival?.slice(0, 16) || "" });
              }}
              onDelete={async (id) => {
                await deleteOrder(id);
                loadAll();
              }}
            />
          </div>
        </EntitySection>
      </div>
    </div>
  );
}
