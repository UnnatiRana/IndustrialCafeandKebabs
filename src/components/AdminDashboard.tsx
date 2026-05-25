import { useMemo, useState } from "react";
import {
  BadgeDollarSign,
  Bike,
  CheckCircle2,
  ClipboardList,
  Coffee,
  PackageCheck,
  RefreshCcw,
  ShoppingBag,
  Store,
  Truck,
  UserRound,
  XCircle,
} from "lucide-react";
import { getPosAdapter, type PosSyncResult } from "../../integrations/pos/posProvider";
import { sendOrderNotification } from "../../notifications/notificationService";
import { statusToNotificationEvent } from "../../notifications/notificationTypes";
import { getDailySalesSummary, mockCategories, mockMenuItems, mockOrders } from "../lib/mockData";
import type { FulfillmentType, MenuItem, Order, OrderStatus } from "../types/domain";

const orderStatuses: OrderStatus[] = [
  "placed",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "out_for_delivery",
  "delivered",
  "picked_up",
  "rejected",
  "cancelled",
];

type MenuDraft = {
  id?: string;
  categoryId: string;
  name: string;
  description: string;
  price: string;
  isAvailable: boolean;
  isInStock: boolean;
};

const emptyDraft: MenuDraft = {
  categoryId: mockCategories[0]?.id ?? "",
  name: "",
  description: "",
  price: "",
  isAvailable: true,
  isInStock: true,
};

function currency(cents: number) {
  return (cents / 100).toLocaleString("en-AU", { style: "currency", currency: "AUD" });
}

function friendlyStatus(status: OrderStatus) {
  return status.replaceAll("_", " ");
}

function nowEvent(status: OrderStatus) {
  return {
    id: crypto.randomUUID(),
    status,
    createdAt: new Date().toISOString(),
    createdBy: "staff-dashboard",
  };
}

export function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(mockMenuItems);
  const [fulfillmentFilter, setFulfillmentFilter] = useState<FulfillmentType | "all">("all");
  const [selectedOrderId, setSelectedOrderId] = useState(mockOrders[0]?.id);
  const [menuDraft, setMenuDraft] = useState<MenuDraft>(emptyDraft);
  const [posLog, setPosLog] = useState<PosSyncResult[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const adapter = getPosAdapter("mock");
  const salesSummary = useMemo(() => getDailySalesSummary(orders), [orders]);
  const visibleOrders = fulfillmentFilter === "all" ? orders : orders.filter((order) => order.fulfillmentType === fulfillmentFilter);
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? visibleOrders[0] ?? orders[0];

  async function recordOrderStatus(order: Order, status: OrderStatus) {
    const notificationEvent = statusToNotificationEvent[status];
    if (!notificationEvent) return;

    await sendOrderNotification({
      event: notificationEvent,
      order: { ...order, status },
      recipient: {
        email: order.customer.email,
        phone: order.customer.phone,
        name: order.customer.fullName,
      },
    });
  }

  async function updateOrderStatus(orderId: string, status: OrderStatus) {
    const existingOrder = orders.find((order) => order.id === orderId);
    if (!existingOrder) return;

    const updatedOrder: Order = {
      ...existingOrder,
      status,
      statusHistory: [nowEvent(status), ...existingOrder.statusHistory],
    };

    setOrders((current) => current.map((order) => (order.id === orderId ? updatedOrder : order)));
    setNotice(`${updatedOrder.orderNumber} moved to ${friendlyStatus(status)}.`);
    await recordOrderStatus(updatedOrder, status);
  }

  function updateMenuDraft(field: keyof MenuDraft, value: string | boolean) {
    setMenuDraft((current) => ({ ...current, [field]: value }));
  }

  function saveMenuItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const priceCents = Math.round(Number(menuDraft.price) * 100);
    if (!menuDraft.name.trim() || Number.isNaN(priceCents) || priceCents < 0) {
      setNotice("Enter a menu item name and valid price.");
      return;
    }

    if (menuDraft.id) {
      setMenuItems((current) =>
        current.map((item) =>
          item.id === menuDraft.id
            ? {
                ...item,
                categoryId: menuDraft.categoryId,
                name: menuDraft.name,
                description: menuDraft.description,
                priceCents,
                isAvailable: menuDraft.isAvailable,
                isInStock: menuDraft.isInStock,
              }
            : item,
        ),
      );
      setNotice(`${menuDraft.name} updated.`);
    } else {
      const newItem: MenuItem = {
        id: crypto.randomUUID(),
        categoryId: menuDraft.categoryId,
        name: menuDraft.name,
        description: menuDraft.description,
        priceCents,
        isAvailable: menuDraft.isAvailable,
        isInStock: menuDraft.isInStock,
        options: [],
      };
      setMenuItems((current) => [newItem, ...current]);
      setNotice(`${newItem.name} added.`);
    }

    setMenuDraft(emptyDraft);
  }

  function editMenuItem(item: MenuItem) {
    setMenuDraft({
      id: item.id,
      categoryId: item.categoryId,
      name: item.name,
      description: item.description,
      price: (item.priceCents / 100).toFixed(2),
      isAvailable: item.isAvailable,
      isInStock: item.isInStock,
    });
  }

  function deleteMenuItem(itemId: string) {
    setMenuItems((current) => current.filter((item) => item.id !== itemId));
    setNotice("Menu item deleted.");
  }

  function updateMenuItem(itemId: string, updates: Partial<MenuItem>) {
    setMenuItems((current) => current.map((item) => (item.id === itemId ? { ...item, ...updates } : item)));
  }

  async function syncMenuFromPos() {
    const result = await adapter.syncMenuFromPos();
    setMenuItems(result.menuItems);
    setPosLog((current) => [result, ...current]);
    setNotice(result.message);
  }

  async function syncStockAvailability() {
    const result = await adapter.syncAvailabilityChanges();
    setMenuItems((current) =>
      current.map((item) => {
        const update = result.updates.find((candidate) => candidate.posExternalId === item.posExternalId);
        return update ? { ...item, isAvailable: update.isAvailable, isInStock: update.isInStock } : item;
      }),
    );
    setPosLog((current) => [result, ...current]);
    setNotice(result.message);
  }

  async function pushOrderToPos() {
    if (!selectedOrder) return;

    const result = await adapter.pushOnlineOrderToPos(selectedOrder);
    setOrders((current) =>
      current.map((order) => (order.id === selectedOrder.id ? { ...order, posSyncStatus: result.ok ? "synced" : "failed" } : order)),
    );
    setPosLog((current) => [result, ...current]);
    setNotice(result.message);
  }

  return (
    <main className="admin-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Industrial Cafe and Kebabs</p>
          <h1>Secure staff admin dashboard</h1>
          <p>Manage live orders, customer details, loyalty, menu availability, pricing, stock, POS sync, and daily sales.</p>
        </div>
        <div className="hero-actions">
          <button className="secondary-button" onClick={syncMenuFromPos} type="button">
            <RefreshCcw aria-hidden="true" /> Sync menu from POS
          </button>
          <button className="secondary-button" onClick={pushOrderToPos} type="button">
            <PackageCheck aria-hidden="true" /> Push order to POS
          </button>
          <button className="secondary-button" onClick={syncStockAvailability} type="button">
            <Store aria-hidden="true" /> Sync stock availability
          </button>
        </div>
      </section>

      {notice ? <aside className="notice">{notice}</aside> : null}

      <section className="summary-grid" aria-label="Daily sales summary">
        <article>
          <BadgeDollarSign aria-hidden="true" />
          <span>Gross sales</span>
          <strong>{currency(salesSummary.grossSalesCents)}</strong>
        </article>
        <article>
          <ClipboardList aria-hidden="true" />
          <span>Total orders</span>
          <strong>{salesSummary.orderCount}</strong>
        </article>
        <article>
          <ShoppingBag aria-hidden="true" />
          <span>Pickup orders</span>
          <strong>{salesSummary.pickupOrderCount}</strong>
        </article>
        <article>
          <Truck aria-hidden="true" />
          <span>Delivery orders</span>
          <strong>{salesSummary.deliveryOrderCount}</strong>
        </article>
      </section>

      <section className="dashboard-grid">
        <div className="panel orders-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Orders</p>
              <h2>All orders</h2>
            </div>
            <div className="segmented-control" aria-label="Filter orders by fulfillment type">
              {(["all", "pickup", "delivery"] as const).map((filter) => (
                <button
                  className={fulfillmentFilter === filter ? "active" : ""}
                  key={filter}
                  onClick={() => setFulfillmentFilter(filter)}
                  type="button"
                >
                  {filter === "pickup" ? <ShoppingBag aria-hidden="true" /> : filter === "delivery" ? <Bike aria-hidden="true" /> : null}
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="order-list">
            {visibleOrders.map((order) => (
              <button
                className={`order-card ${selectedOrder?.id === order.id ? "selected" : ""}`}
                key={order.id}
                onClick={() => setSelectedOrderId(order.id)}
                type="button"
              >
                <span>
                  <strong>{order.orderNumber}</strong>
                  <small>{order.customer.fullName}</small>
                </span>
                <span>
                  <strong>{currency(order.totalCents)}</strong>
                  <small>{friendlyStatus(order.status)}</small>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="panel">
          {selectedOrder ? (
            <>
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Order details</p>
                  <h2>{selectedOrder.orderNumber}</h2>
                </div>
                <span className={`status-pill status-${selectedOrder.status}`}>{friendlyStatus(selectedOrder.status)}</span>
              </div>

              <div className="action-row">
                <button className="success-button" onClick={() => updateOrderStatus(selectedOrder.id, "confirmed")} type="button">
                  <CheckCircle2 aria-hidden="true" /> Accept
                </button>
                <button className="danger-button" onClick={() => updateOrderStatus(selectedOrder.id, "rejected")} type="button">
                  <XCircle aria-hidden="true" /> Reject
                </button>
                <label className="status-select">
                  Update status
                  <select value={selectedOrder.status} onChange={(event) => updateOrderStatus(selectedOrder.id, event.target.value as OrderStatus)}>
                    {orderStatuses.map((status) => (
                      <option key={status} value={status}>
                        {friendlyStatus(status)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="detail-grid">
                <article>
                  <UserRound aria-hidden="true" />
                  <h3>Customer</h3>
                  <p>{selectedOrder.customer.fullName}</p>
                  <p>{selectedOrder.customer.email}</p>
                  <p>{selectedOrder.customer.phone}</p>
                  <p>Loyalty: {selectedOrder.customer.loyaltyPoints} points</p>
                </article>
                <article>
                  <Truck aria-hidden="true" />
                  <h3>{selectedOrder.fulfillmentType}</h3>
                  <p>{selectedOrder.deliveryAddress ?? "Pickup at cafe counter"}</p>
                  {selectedOrder.deliveryInstructions ? <p>{selectedOrder.deliveryInstructions}</p> : null}
                  <p>POS: {selectedOrder.posSyncStatus}</p>
                </article>
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {item.name}
                        {item.selectedOptions.length ? <small>{item.selectedOptions.join(", ")}</small> : null}
                      </td>
                      <td>{item.quantity}</td>
                      <td>{currency(item.unitPriceCents * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p>No orders yet.</p>
          )}
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Menu</p>
              <h2>Add or edit items</h2>
            </div>
            <Coffee aria-hidden="true" />
          </div>
          <form className="menu-form" onSubmit={saveMenuItem}>
            <label>
              Category
              <select value={menuDraft.categoryId} onChange={(event) => updateMenuDraft("categoryId", event.target.value)}>
                {mockCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Name
              <input value={menuDraft.name} onChange={(event) => updateMenuDraft("name", event.target.value)} />
            </label>
            <label>
              Description
              <textarea value={menuDraft.description} onChange={(event) => updateMenuDraft("description", event.target.value)} />
            </label>
            <label>
              Price
              <input inputMode="decimal" value={menuDraft.price} onChange={(event) => updateMenuDraft("price", event.target.value)} />
            </label>
            <div className="checkbox-row">
              <label>
                <input
                  checked={menuDraft.isAvailable}
                  onChange={(event) => updateMenuDraft("isAvailable", event.target.checked)}
                  type="checkbox"
                />
                Available
              </label>
              <label>
                <input checked={menuDraft.isInStock} onChange={(event) => updateMenuDraft("isInStock", event.target.checked)} type="checkbox" />
                In stock
              </label>
            </div>
            <div className="action-row">
              <button className="primary-button" type="submit">
                {menuDraft.id ? "Save item" : "Add item"}
              </button>
              {menuDraft.id ? (
                <button className="ghost-button" onClick={() => setMenuDraft(emptyDraft)} type="button">
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </div>

        <div className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Menu</p>
              <h2>Items and stock</h2>
            </div>
          </div>
          <div className="menu-list">
            {menuItems.map((item) => (
              <article className="menu-card" key={item.id}>
                <div>
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                  <strong>{currency(item.priceCents)}</strong>
                </div>
                <div className="menu-actions">
                  <button className="ghost-button" onClick={() => editMenuItem(item)} type="button">
                    Edit
                  </button>
                  <button className="ghost-button" onClick={() => updateMenuItem(item.id, { isAvailable: !item.isAvailable })} type="button">
                    {item.isAvailable ? "Disable" : "Enable"}
                  </button>
                  <button className="ghost-button" onClick={() => updateMenuItem(item.id, { isInStock: false, isAvailable: false })} type="button">
                    Mark out of stock
                  </button>
                  <button className="danger-button" onClick={() => deleteMenuItem(item.id)} type="button">
                    Delete
                  </button>
                </div>
                <p className="stock-line">
                  {item.isAvailable ? "Available" : "Unavailable"} / {item.isInStock ? "In stock" : "Out of stock"}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">POS</p>
            <h2>Sync log</h2>
          </div>
        </div>
        {posLog.length ? (
          <div className="sync-log">
            {posLog.map((entry) => (
              <article key={`${entry.action}-${entry.syncedAt}`}>
                <strong>{entry.action}</strong>
                <span>{entry.message}</span>
                <small>{new Date(entry.syncedAt).toLocaleString()}</small>
              </article>
            ))}
          </div>
        ) : (
          <p>No POS sync actions have run yet.</p>
        )}
      </section>
    </main>
  );
}
