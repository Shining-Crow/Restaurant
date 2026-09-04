"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { categoryConfig, catOrder } from "@/lib/menu-config";
import type { MenuCategory } from "@/lib/menu-types";
import { SITE_SETTING_KEYS } from "@/lib/site-settings-shared";
import { scrollToSection } from "@/lib/scroll";
import { useMenuItems } from "@/components/MenuContext";
import { useSiteSettings } from "@/components/SiteSettingsContext";
import { useToast } from "@/components/ToastContext";

type AdminView =
  | "dashboard"
  | "menu-items"
  | "add-item"
  | "specials-mgmt"
  | "bookings"
  | "orders"
  | "settings";

type Props = {
  open: boolean;
  onClose: () => void;
};

type AdminOrderRow = {
  id: string;
  paymentReference: string | null;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  orderType: string;
  preferredTime: string | null;
  total: number;
  status: string;
  printJobs: {
    id: string;
    tradeNo: string;
    status: string;
    isReprint: boolean;
    attemptCount: number;
    lastError: string | null;
  }[];
};

export function AdminPanel({ open, onClose }: Props) {
  const router = useRouter();
  const site = useSiteSettings();
  const { items, setItems } = useMenuItems();
  const showToast = useToast();
  const [view, setView] = useState<AdminView>("dashboard");
  const [settingsForm, setSettingsForm] = useState<Record<
    string,
    string
  > | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [adminSearch, setAdminSearch] = useState("");
  const [adminCatFilter, setAdminCatFilter] = useState("");
  const [currentEditId, setCurrentEditId] = useState<number | null>(null);

  const [fiName, setFiName] = useState("");
  const [fiPrice, setFiPrice] = useState("");
  const [fiDesc, setFiDesc] = useState("");
  const [fiCat, setFiCat] = useState<MenuCategory | "">("");
  const [fiImg, setFiImg] = useState("");
  const [fiAvail, setFiAvail] = useState("true");
  const [fiExtras, setFiExtras] = useState("");
  const [tagV, setTagV] = useState(false);
  const [tagVg, setTagVg] = useState(false);
  const [tagGf, setTagGf] = useState(false);
  const [tagSp, setTagSp] = useState(false);
  const [tagPop, setTagPop] = useState(false);
  const [adminOrders, setAdminOrders] = useState<AdminOrderRow[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [reprintingId, setReprintingId] = useState<string | null>(null);

  const previewPublic = useCallback(() => {
    onClose();
    scrollToSection("menu");
  }, [onClose]);

  const clearItemForm = useCallback(() => {
    setFiName("");
    setFiPrice("");
    setFiDesc("");
    setFiCat("");
    setFiImg("");
    setFiExtras("");
    setFiAvail("true");
    setTagV(false);
    setTagVg(false);
    setTagGf(false);
    setTagSp(false);
    setTagPop(false);
    setCurrentEditId(null);
  }, []);

  const showAdminView = useCallback(
    (v: AdminView) => {
      setView(v);
      if (v === "add-item") {
        clearItemForm();
      }
    },
    [clearItemForm],
  );

  const toggleAvailability = useCallback(
    (id: number, val: boolean) => {
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, available: val } : i)),
      );
      showToast(val ? "Item set as available" : "Item hidden from menu");
    },
    [setItems, showToast],
  );

  const deleteItem = useCallback(
    (id: number) => {
      if (!confirm("Delete this menu item? This cannot be undone.")) return;
      setItems((prev) => prev.filter((i) => i.id !== id));
      showToast("Item deleted");
    },
    [setItems, showToast],
  );

  const editItem = useCallback(
    (id: number) => {
      const item = items.find((i) => i.id === id);
      if (!item) return;
      setCurrentEditId(id);
      setFiName(item.name);
      setFiPrice(String(item.price));
      setFiDesc(item.desc);
      setFiCat(item.cat);
      setFiImg(item.img || "");
      setFiAvail(item.available ? "true" : "false");
      setFiExtras(item.extras || "");
      setTagV(item.tags?.includes("v") ?? false);
      setTagVg(item.tags?.includes("vg") ?? false);
      setTagGf(item.tags?.includes("gf") ?? false);
      setTagSp(item.tags?.includes("sp") ?? false);
      setTagPop(item.popular ?? false);
      setView("add-item");
    },
    [items],
  );

  const cancelEdit = useCallback(() => {
    clearItemForm();
    setView("menu-items");
  }, [clearItemForm]);

  const saveMenuItem = useCallback(() => {
    const name = fiName.trim();
    const price = parseFloat(fiPrice);
    const desc = fiDesc.trim();
    const cat = fiCat;
    if (!name || Number.isNaN(price) || !desc || !cat) {
      alert("Please fill in all required fields.");
      return;
    }
    const tags = ["v", "vg", "gf", "sp"].filter((t) => {
      if (t === "v") return tagV;
      if (t === "vg") return tagVg;
      if (t === "gf") return tagGf;
      if (t === "sp") return tagSp;
      return false;
    }) as ("v" | "vg" | "gf" | "sp")[];
    const popular = tagPop;
    const available = fiAvail === "true";
    const img = fiImg.trim();
    const extras = fiExtras.trim();

    if (currentEditId != null) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === currentEditId
            ? {
                ...i,
                name,
                price,
                desc,
                cat,
                tags,
                popular,
                available,
                img,
                extras,
              }
            : i,
        ),
      );
      showToast("Item updated!");
    } else {
      setItems((prev) => {
        const newId = Math.max(...prev.map((i) => i.id), 0) + 1;
        return [
          ...prev,
          {
            id: newId,
            name,
            price,
            desc,
            cat,
            tags,
            popular,
            available,
            img,
            extras,
          },
        ];
      });
      showToast("✅ New item added to menu!");
    }
    clearItemForm();
    setView("menu-items");
  }, [
    fiName,
    fiPrice,
    fiDesc,
    fiCat,
    fiAvail,
    fiImg,
    fiExtras,
    tagV,
    tagVg,
    tagGf,
    tagSp,
    tagPop,
    currentEditId,
    setItems,
    showToast,
    clearItemForm,
  ]);

  const filteredAdminItems = useMemo(() => {
    const q = adminSearch.toLowerCase();
    return items.filter((i) => {
      const matchSearch =
        !q ||
        i.name.toLowerCase().includes(q) ||
        i.desc.toLowerCase().includes(q);
      const matchCat = !adminCatFilter || i.cat === adminCatFilter;
      return matchSearch && matchCat;
    });
  }, [items, adminSearch, adminCatFilter]);

  const dashRecent = useMemo(() => items.slice(0, 8), [items]);

  useEffect(() => {
    if (!open || view !== "settings") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/site-settings");
        const data = (await res.json()) as { values?: Record<string, string> };
        if (cancelled || !data.values) return;
        setSettingsForm(data.values);
      } catch {
        if (!cancelled) showToast("Could not load site settings.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, view, showToast]);

  const getAdminKey = useCallback((): string | null => {
    const stored =
      typeof window !== "undefined"
        ? sessionStorage.getItem("admin_menu_key")
        : null;
    const key =
      stored?.trim() ||
      (typeof window !== "undefined"
        ? window.prompt("Enter ADMIN_MENU_KEY (from server .env):")
        : null);
    if (!key?.trim()) return null;
    sessionStorage.setItem("admin_menu_key", key.trim());
    return key.trim();
  }, []);

  const loadAdminOrders = useCallback(async () => {
    const key = getAdminKey();
    if (!key) {
      showToast("Admin key is required to load orders.");
      return;
    }
    setOrdersLoading(true);
    try {
      const res = await fetch("/api/admin/orders", {
        headers: { Authorization: `Bearer ${key}` },
      });
      const data = (await res.json().catch(() => ({}))) as {
        orders?: AdminOrderRow[];
        error?: string;
      };
      if (!res.ok) {
        showToast(data.error || "Could not load orders.");
        return;
      }
      setAdminOrders(data.orders || []);
    } catch {
      showToast("Could not load orders.");
    } finally {
      setOrdersLoading(false);
    }
  }, [getAdminKey, showToast]);

  useEffect(() => {
    if (open && view === "orders") {
      void loadAdminOrders();
    }
  }, [open, view, loadAdminOrders]);

  const reprintOrder = useCallback(
    async (orderId: string) => {
      const key = getAdminKey();
      if (!key) {
        showToast("Admin key is required to reprint.");
        return;
      }
      setReprintingId(orderId);
      try {
        const res = await fetch(`/api/admin/orders/${orderId}/reprint`, {
          method: "POST",
          headers: { Authorization: `Bearer ${key}` },
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          result?: { status: string };
        };
        if (!res.ok) {
          showToast(data.error || "Reprint failed.");
          return;
        }
        showToast(
          data.result?.status === "submitted"
            ? "Reprint sent to kitchen printer."
            : `Reprint: ${data.result?.status || "done"}`,
        );
        await loadAdminOrders();
      } catch {
        showToast("Reprint failed.");
      } finally {
        setReprintingId(null);
      }
    },
    [getAdminKey, loadAdminOrders, showToast],
  );

  const updateSiteSetting = useCallback((key: string, value: string) => {
    setSettingsForm((prev) => ({ ...(prev ?? {}), [key]: value }));
  }, []);

  const saveSiteSettings = useCallback(async () => {
    if (!settingsForm) return;
    const key = getAdminKey();
    if (!key) {
      showToast("Admin key is required to save.");
      return;
    }
    setSettingsSaving(true);
    try {
      const res = await fetch("/api/site-settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({ settings: settingsForm }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof (data as { error?: unknown }).error === "string"
            ? (data as { error: string }).error
            : "Could not save settings";
        showToast(msg);
        return;
      }
      showToast("Settings saved.");
      router.refresh();
    } catch {
      showToast("Could not save settings.");
    } finally {
      setSettingsSaving(false);
    }
  }, [getAdminKey, settingsForm, router, showToast]);

  if (!open) return null;

  return (
    <div id="admin-panel" className="open">
      <div className="admin-topbar">
        <div className="admin-logo">
          {site.restaurantName} <span>Admin</span>
        </div>
        <div className="admin-topbar-actions">
          <button type="button" className="admin-close-btn" onClick={previewPublic}>
            👁 Preview Site
          </button>
          <button type="button" className="admin-close-btn" onClick={onClose}>
            ✕ Close Dashboard
          </button>
        </div>
      </div>
      <div className="admin-layout">
        <nav className="admin-sidebar">
          <div className="admin-sidebar-section">
            <div className="admin-sidebar-label">Overview</div>
            <button
              type="button"
              className={`admin-nav-item${view === "dashboard" ? " active" : ""}`}
              onClick={() => setView("dashboard")}
            >
              <span className="nav-icon">🏠</span> Dashboard
            </button>
          </div>
          <div className="admin-sidebar-section">
            <div className="admin-sidebar-label">Menu Management</div>
            <button
              type="button"
              className={`admin-nav-item${view === "menu-items" ? " active" : ""}`}
              onClick={() => setView("menu-items")}
            >
              <span className="nav-icon">📋</span> All Menu Items
            </button>
            <button
              type="button"
              className={`admin-nav-item${view === "add-item" ? " active" : ""}`}
              onClick={() => showAdminView("add-item")}
            >
              <span className="nav-icon">➕</span> Add New Item
            </button>
            <button
              type="button"
              className={`admin-nav-item${view === "specials-mgmt" ? " active" : ""}`}
              onClick={() => setView("specials-mgmt")}
            >
              <span className="nav-icon">⭐</span> Specials & Offers
            </button>
          </div>
          <div className="admin-sidebar-section">
            <div className="admin-sidebar-label">Restaurant</div>
            <button
              type="button"
              className={`admin-nav-item${view === "bookings" ? " active" : ""}`}
              onClick={() => setView("bookings")}
            >
              <span className="nav-icon">🍽</span> Bookings
            </button>
            <button
              type="button"
              className={`admin-nav-item${view === "orders" ? " active" : ""}`}
              onClick={() => setView("orders")}
            >
              <span className="nav-icon">📦</span> Orders
            </button>
            <button
              type="button"
              className={`admin-nav-item${view === "settings" ? " active" : ""}`}
              onClick={() => setView("settings")}
            >
              <span className="nav-icon">⚙</span> Settings
            </button>
          </div>
        </nav>

        <main className="admin-main">
          <div
            className={`admin-view${view === "dashboard" ? " active" : ""}`}
            id="view-dashboard"
          >
            <h1 className="admin-page-title">Good evening 👋</h1>
            <p className="admin-page-sub">
              Welcome to the {site.restaurantName} admin dashboard. Manage your
              menu, bookings and settings below.
            </p>
            <div className="admin-stats">
              <div className="stat-card">
                <div className="stat-value">{items.length}</div>
                <div className="stat-label">Total Menu Items</div>
                <div className="stat-change">↑ All categories</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">
                  {items.filter((i) => i.available).length}
                </div>
                <div className="stat-label">Available Today</div>
                <div className="stat-change">↑ Currently live</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{catOrder.length}</div>
                <div className="stat-label">Menu Categories</div>
                <div className="stat-change">Across all sections</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">★ 4.8</div>
                <div className="stat-label">Customer Rating</div>
                <div className="stat-change">↑ Excellent feedback</div>
              </div>
            </div>
            <div className="admin-table-wrap">
              <div className="admin-table-header">
                <span className="admin-table-title">Recent Menu Items</span>
                <button
                  type="button"
                  className="btn-gold"
                  style={{ padding: "8px 18px", fontSize: "0.78rem" }}
                  onClick={() => showAdminView("add-item")}
                >
                  + Add Item
                </button>
              </div>
              <table className="admin-table" id="dash-recent-table">
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Available</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dashRecent.map((item) => (
                    <tr key={item.id}>
                      <td className="item-name-cell">{item.name}</td>
                      <td>
                        <span className="item-cat-badge">
                          {categoryConfig[item.cat]?.label || item.cat}
                        </span>
                      </td>
                      <td
                        style={{
                          color: "var(--gold-light)",
                          fontWeight: 600,
                        }}
                      >
                        £{item.price.toFixed(2)}
                      </td>
                      <td>
                        <label className="availability-toggle">
                          <input
                            type="checkbox"
                            checked={item.available}
                            onChange={(e) =>
                              toggleAvailability(item.id, e.target.checked)
                            }
                          />
                          <span className="toggle-slider" />
                        </label>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="admin-action-btn btn-edit"
                          onClick={() => editItem(item.id)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="admin-action-btn btn-delete"
                          onClick={() => deleteItem(item.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div
            className={`admin-view${view === "menu-items" ? " active" : ""}`}
            id="view-menu-items"
          >
            <h1 className="admin-page-title">All Menu Items</h1>
            <p className="admin-page-sub">
              Edit, toggle availability, or remove items from your live menu.
            </p>
            <div
              style={{
                display: "flex",
                gap: "12px",
                marginBottom: "24px",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <input
                type="text"
                className="admin-input"
                style={{ maxWidth: "300px" }}
                placeholder="🔍 Search items..."
                value={adminSearch}
                onChange={(e) => setAdminSearch(e.target.value)}
              />
              <select
                className="admin-select"
                style={{ maxWidth: "200px" }}
                value={adminCatFilter}
                onChange={(e) => setAdminCatFilter(e.target.value)}
              >
                <option value="">All Categories</option>
                <option value="starters">Starters</option>
                <option value="pasta">Pasta</option>
                <option value="pizza">Pizza</option>
                <option value="chicken">Chicken & Meat</option>
                <option value="risotto">Risotto</option>
                <option value="crespelle">Crespelle</option>
                <option value="burgers">Burgers</option>
                <option value="bread">Bread</option>
                <option value="sides">Sides</option>
                <option value="kids">Kids</option>
              </select>
              <button
                type="button"
                className="btn-gold"
                style={{ padding: "9px 20px", fontSize: "0.8rem" }}
                onClick={() => showAdminView("add-item")}
              >
                + Add New Item
              </button>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table" id="all-items-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Tags</th>
                    <th>Available</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAdminItems.map((item) => {
                    const allTags = [
                      ...(item.tags || []),
                      ...(item.popular ? ["pop"] : []),
                    ];
                    return (
                      <tr key={item.id}>
                        <td className="item-name-cell">{item.name}</td>
                        <td>
                          <span className="item-cat-badge">
                            {categoryConfig[item.cat]?.label || item.cat}
                          </span>
                        </td>
                        <td
                          style={{
                            color: "var(--gold-light)",
                            fontWeight: 600,
                          }}
                        >
                          £{item.price.toFixed(2)}
                        </td>
                        <td style={{ fontSize: "0.75rem", color: "#777" }}>
                          {allTags.join(", ") || "—"}
                        </td>
                        <td>
                          <label className="availability-toggle">
                            <input
                              type="checkbox"
                              checked={item.available}
                              onChange={(e) =>
                                toggleAvailability(item.id, e.target.checked)
                              }
                            />
                            <span className="toggle-slider" />
                          </label>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="admin-action-btn btn-edit"
                            onClick={() => editItem(item.id)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="admin-action-btn btn-delete"
                            onClick={() => deleteItem(item.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div
            className={`admin-view${view === "add-item" ? " active" : ""}`}
            id="view-add-item"
          >
            <h1 className="admin-page-title">
              {currentEditId != null
                ? `Edit: ${fiName || "Item"}`
                : "Add New Menu Item"}
            </h1>
            <p className="admin-page-sub">
              Fill in the details below. Changes are saved to local storage and
              reflected on the live menu instantly.
            </p>
            <div
              style={{
                background: "#1A1A1A",
                border: "1px solid #2A2A2A",
                borderRadius: "var(--r-xl)",
                padding: "36px",
                maxWidth: "720px",
              }}
            >
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label className="admin-form-label">Item Name *</label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="e.g. Pollo Crema"
                    value={fiName}
                    onChange={(e) => setFiName(e.target.value)}
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Price (£) *</label>
                  <input
                    type="number"
                    className="admin-input"
                    placeholder="13.95"
                    step={0.01}
                    value={fiPrice}
                    onChange={(e) => setFiPrice(e.target.value)}
                  />
                </div>
              </div>
              <div className="admin-form-group full">
                <label className="admin-form-label">Description *</label>
                <textarea
                  className="admin-textarea"
                  placeholder="Describe the dish..."
                  value={fiDesc}
                  onChange={(e) => setFiDesc(e.target.value)}
                />
              </div>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label className="admin-form-label">Category *</label>
                  <select
                    className="admin-select"
                    value={fiCat}
                    onChange={(e) =>
                      setFiCat(e.target.value as MenuCategory | "")
                    }
                  >
                    <option value="">Select category</option>
                    <option value="starters">Starters</option>
                    <option value="pasta">Pasta</option>
                    <option value="pizza">Pizza</option>
                    <option value="chicken">Chicken & Meat</option>
                    <option value="risotto">Risotto</option>
                    <option value="crespelle">Crespelle</option>
                    <option value="burgers">Burgers</option>
                    <option value="bread">Bread</option>
                    <option value="sides">Sides</option>
                    <option value="kids">Kids</option>
                  </select>
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Image URL</label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="https://... or leave blank"
                    value={fiImg}
                    onChange={(e) => setFiImg(e.target.value)}
                  />
                </div>
              </div>
              <div className="admin-form-group full">
                <label className="admin-form-label">Dietary Tags</label>
                <div className="admin-tags-group">
                  <label className="admin-tag-check">
                    <input
                      type="checkbox"
                      checked={tagV}
                      onChange={(e) => setTagV(e.target.checked)}
                    />{" "}
                    Vegetarian
                  </label>
                  <label className="admin-tag-check">
                    <input
                      type="checkbox"
                      checked={tagVg}
                      onChange={(e) => setTagVg(e.target.checked)}
                    />{" "}
                    Vegan
                  </label>
                  <label className="admin-tag-check">
                    <input
                      type="checkbox"
                      checked={tagGf}
                      onChange={(e) => setTagGf(e.target.checked)}
                    />{" "}
                    Gluten-Free
                  </label>
                  <label className="admin-tag-check">
                    <input
                      type="checkbox"
                      checked={tagSp}
                      onChange={(e) => setTagSp(e.target.checked)}
                    />{" "}
                    Spicy
                  </label>
                  <label className="admin-tag-check">
                    <input
                      type="checkbox"
                      checked={tagPop}
                      onChange={(e) => setTagPop(e.target.checked)}
                    />{" "}
                    Popular
                  </label>
                </div>
              </div>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label className="admin-form-label">Available?</label>
                  <select
                    className="admin-select"
                    value={fiAvail}
                    onChange={(e) => setFiAvail(e.target.value)}
                  >
                    <option value="true">Yes — Live on menu</option>
                    <option value="false">No — Hidden</option>
                  </select>
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Extras / Add-ons</label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="e.g. Extra cheese +£1.50"
                    value={fiExtras}
                    onChange={(e) => setFiExtras(e.target.value)}
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: "14px", marginTop: "10px" }}>
                <button
                  type="button"
                  className="modal-save"
                  style={{ padding: "13px 32px", fontSize: "0.85rem" }}
                  onClick={saveMenuItem}
                >
                  Save Item
                </button>
                <button
                  type="button"
                  className="modal-cancel"
                  style={{ padding: "13px 24px" }}
                  onClick={cancelEdit}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>

          <div
            className={`admin-view${view === "specials-mgmt" ? " active" : ""}`}
            id="view-specials-mgmt"
          >
            <h1 className="admin-page-title">Specials & Offers</h1>
            <p className="admin-page-sub">
              Mark items as specials or add promotional offers. These will
              appear in the Specials section on the website.
            </p>
            <div
              style={{
                background: "#1A1A1A",
                border: "1px solid #2A2A2A",
                borderRadius: "var(--r-lg)",
                padding: "28px",
                maxWidth: "600px",
              }}
            >
              <p style={{ color: "#888", fontSize: "0.88rem", lineHeight: 1.7 }}>
                💡 To feature a dish as a special, go to{" "}
                <strong style={{ color: "#CCC" }}>All Menu Items</strong> →
                Edit → check the <strong style={{ color: "#CCC" }}>Popular</strong>{" "}
                tag. It will automatically appear as a highlighted dish.
                <br />
                <br />
                For custom promotional banners or seasonal specials, edit the{" "}
                <code
                  style={{
                    background: "#252525",
                    padding: "2px 6px",
                    borderRadius: "3px",
                    color: "var(--gold)",
                  }}
                >
                  #specials
                </code>{" "}
                section in the site directly, or connect a CMS like Contentful
                or Sanity for rich content management.
              </p>
            </div>
          </div>

          <div
            className={`admin-view${view === "bookings" ? " active" : ""}`}
            id="view-bookings"
          >
            <h1 className="admin-page-title">Table Bookings</h1>
            <p className="admin-page-sub">
              Booking enquiries submitted via the website will appear here once
              connected to a backend.
            </p>
            <div
              style={{
                background: "#1A1A1A",
                border: "1px solid #2A2A2A",
                borderRadius: "var(--r-lg)",
                padding: "40px",
                textAlign: "center",
                maxWidth: "560px",
              }}
            >
              <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🍽</div>
              <h3
                style={{
                  color: "#FAF6EF",
                  fontFamily: "var(--font-playfair), 'Playfair Display', serif",
                  marginBottom: "10px",
                }}
              >
                Connect a Backend
              </h3>
              <p style={{ color: "#666", fontSize: "0.88rem", lineHeight: 1.7 }}>
                To capture and view real bookings, connect a backend such as{" "}
                <strong style={{ color: "#AAA" }}>Supabase</strong>,{" "}
                <strong style={{ color: "#AAA" }}>Firebase</strong>, or a simple{" "}
                <strong style={{ color: "#AAA" }}>EmailJS</strong> integration.
              </p>
            </div>
          </div>

          <div
            className={`admin-view${view === "orders" ? " active" : ""}`}
            id="view-orders"
          >
            <h1 className="admin-page-title">Orders</h1>
            <p className="admin-page-sub">
              Paid and cash takeaway orders. Kitchen tickets print after
              verified payment (or when cash orders are placed). Use Reprint if
              a ticket is missing.
            </p>
            <div style={{ marginBottom: "14px" }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => void loadAdminOrders()}
                disabled={ordersLoading}
              >
                {ordersLoading ? "Loading…" : "Refresh"}
              </button>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Customer</th>
                    <th>Type</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Print</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {adminOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ color: "#666" }}>
                        {ordersLoading
                          ? "Loading orders…"
                          : "No orders yet."}
                      </td>
                    </tr>
                  ) : (
                    adminOrders.map((o) => {
                      const latest = o.printJobs[0];
                      const canReprint =
                        o.status === "paid" || o.status === "awaiting_cash";
                      return (
                        <tr key={o.id}>
                          <td style={{ whiteSpace: "nowrap" }}>
                            {new Date(o.createdAt).toLocaleString("en-GB")}
                          </td>
                          <td>
                            <div>{o.customerName}</div>
                            <div style={{ color: "#888", fontSize: "0.8rem" }}>
                              {o.customerPhone}
                            </div>
                            <div style={{ color: "#666", fontSize: "0.75rem" }}>
                              {o.paymentReference}
                            </div>
                          </td>
                          <td>
                            {o.orderType}
                            {o.preferredTime ? (
                              <div style={{ color: "#888", fontSize: "0.8rem" }}>
                                {o.preferredTime}
                              </div>
                            ) : null}
                          </td>
                          <td>£{o.total.toFixed(2)}</td>
                          <td>{o.status}</td>
                          <td>
                            {latest ? (
                              <>
                                <div>
                                  {latest.status}
                                  {latest.isReprint ? " (reprint)" : ""}
                                </div>
                                {latest.lastError ? (
                                  <div
                                    style={{
                                      color: "#c97",
                                      fontSize: "0.75rem",
                                      maxWidth: 180,
                                    }}
                                  >
                                    {latest.lastError}
                                  </div>
                                ) : null}
                              </>
                            ) : (
                              <span style={{ color: "#666" }}>—</span>
                            )}
                          </td>
                          <td>
                            {canReprint ? (
                              <button
                                type="button"
                                className="btn btn-outline"
                                style={{ padding: "6px 10px", fontSize: "0.75rem" }}
                                disabled={reprintingId === o.id}
                                onClick={() => void reprintOrder(o.id)}
                              >
                                {reprintingId === o.id ? "Sending…" : "Reprint"}
                              </button>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div
            className={`admin-view${view === "settings" ? " active" : ""}`}
            id="view-settings"
          >
            <h1 className="admin-page-title">Settings</h1>
            <p className="admin-page-sub">
              Values are stored in <code>site_settings</code> and shown on the
              public site (name, phone, address, announcement bar, info-strip
              hours). Opening hours use the <code>opening_hours</code> table.
            </p>
            <div
              style={{
                background: "#1A1A1A",
                border: "1px solid #2A2A2A",
                borderRadius: "var(--r-xl)",
                padding: "36px",
                maxWidth: "640px",
              }}
            >
              {settingsForm === null ? (
                <p style={{ color: "#888", fontSize: "0.9rem" }}>
                  Loading settings…
                </p>
              ) : (
                <>
                  <div className="admin-form-group">
                    <label className="admin-form-label">Restaurant name</label>
                    <input
                      type="text"
                      className="admin-input"
                      value={
                        settingsForm[SITE_SETTING_KEYS.restaurantName] ?? ""
                      }
                      onChange={(e) =>
                        updateSiteSetting(
                          SITE_SETTING_KEYS.restaurantName,
                          e.target.value,
                        )
                      }
                    />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-form-label">Tagline</label>
                    <input
                      type="text"
                      className="admin-input"
                      value={
                        settingsForm[SITE_SETTING_KEYS.restaurantTagline] ?? ""
                      }
                      onChange={(e) =>
                        updateSiteSetting(
                          SITE_SETTING_KEYS.restaurantTagline,
                          e.target.value,
                        )
                      }
                    />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-form-label">Phone</label>
                    <input
                      type="text"
                      className="admin-input"
                      value={settingsForm[SITE_SETTING_KEYS.phone] ?? ""}
                      onChange={(e) =>
                        updateSiteSetting(SITE_SETTING_KEYS.phone, e.target.value)
                      }
                    />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-form-label">Email</label>
                    <input
                      type="email"
                      className="admin-input"
                      value={
                        settingsForm[SITE_SETTING_KEYS.restaurantEmail] ?? ""
                      }
                      onChange={(e) =>
                        updateSiteSetting(
                          SITE_SETTING_KEYS.restaurantEmail,
                          e.target.value,
                        )
                      }
                    />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-form-label">
                      Address (use line breaks for multiple lines)
                    </label>
                    <textarea
                      className="admin-textarea"
                      rows={4}
                      value={settingsForm[SITE_SETTING_KEYS.address] ?? ""}
                      onChange={(e) =>
                        updateSiteSetting(
                          SITE_SETTING_KEYS.address,
                          e.target.value,
                        )
                      }
                    />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-form-label">
                      Announcement bar (top banner text). Use {"{phone}"} for
                      the restaurant number.
                    </label>
                    <textarea
                      className="admin-textarea"
                      rows={3}
                      value={
                        settingsForm[SITE_SETTING_KEYS.announcementBar] ?? ""
                      }
                      onChange={(e) =>
                        updateSiteSetting(
                          SITE_SETTING_KEYS.announcementBar,
                          e.target.value,
                        )
                      }
                    />
                  </div>
                  <p
                    style={{
                      color: "#666",
                      fontSize: "0.82rem",
                      marginBottom: "16px",
                      marginTop: "8px",
                    }}
                  >
                    Info strip (below hero)
                  </p>
                  <div className="admin-form-row">
                    <div className="admin-form-group">
                      <label className="admin-form-label">
                        Weekday strip label
                      </label>
                      <input
                        type="text"
                        className="admin-input"
                        value={
                          settingsForm[SITE_SETTING_KEYS.hoursStripWeekdayLabel] ??
                          ""
                        }
                        onChange={(e) =>
                          updateSiteSetting(
                            SITE_SETTING_KEYS.hoursStripWeekdayLabel,
                            e.target.value,
                          )
                        }
                      />
                    </div>
                    <div className="admin-form-group">
                      <label className="admin-form-label">
                        Weekday strip hours
                      </label>
                      <input
                        type="text"
                        className="admin-input"
                        value={
                          settingsForm[SITE_SETTING_KEYS.hoursStripWeekdayTime] ??
                          ""
                        }
                        onChange={(e) =>
                          updateSiteSetting(
                            SITE_SETTING_KEYS.hoursStripWeekdayTime,
                            e.target.value,
                          )
                        }
                      />
                    </div>
                  </div>
                  <div className="admin-form-row">
                    <div className="admin-form-group">
                      <label className="admin-form-label">
                        Weekend strip label
                      </label>
                      <input
                        type="text"
                        className="admin-input"
                        value={
                          settingsForm[SITE_SETTING_KEYS.hoursStripWeekendLabel] ??
                          ""
                        }
                        onChange={(e) =>
                          updateSiteSetting(
                            SITE_SETTING_KEYS.hoursStripWeekendLabel,
                            e.target.value,
                          )
                        }
                      />
                    </div>
                    <div className="admin-form-group">
                      <label className="admin-form-label">
                        Weekend strip hours
                      </label>
                      <input
                        type="text"
                        className="admin-input"
                        value={
                          settingsForm[SITE_SETTING_KEYS.hoursStripWeekendTime] ??
                          ""
                        }
                        onChange={(e) =>
                          updateSiteSetting(
                            SITE_SETTING_KEYS.hoursStripWeekendTime,
                            e.target.value,
                          )
                        }
                      />
                    </div>
                  </div>
                  <p style={{ color: "#666", fontSize: "0.78rem", marginBottom: "14px" }}>
                    Saving requires <strong>ADMIN_MENU_KEY</strong> on the server.
                    You&apos;ll be prompted once; it is stored in this
                    browser&apos;s session storage.
                  </p>
                  <div style={{ marginTop: "8px" }}>
                    <button
                      type="button"
                      className="modal-save"
                      style={{ padding: "12px 28px" }}
                      disabled={settingsSaving}
                      onClick={() => void saveSiteSettings()}
                    >
                      {settingsSaving ? "Saving…" : "Save settings"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
