"use client";

import { useMemo, useState, type ReactNode } from "react";
import { categoryConfig, catOrder } from "@/lib/menu-config";
import type { MenuCategory } from "@/lib/menu-types";
import { MenuAddButton } from "@/components/MenuAddButton";
import { useMenuItems } from "@/components/MenuContext";

const TABS: { id: "all" | MenuCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "starters", label: "Starters" },
  { id: "pasta", label: "Pasta" },
  { id: "pizza", label: "Pizza" },
  { id: "risotto", label: "Risotto" },
  { id: "crespelle", label: "Crespelle" },
  { id: "chicken", label: "Chicken & Meat" },
  { id: "burgers", label: "Burgers" },
  { id: "bread", label: "Bread" },
  { id: "sides", label: "Sides" },
  { id: "kids", label: "Kids" },
];

function TagList({ tags }: { tags: string[] }) {
  return (
    <div className="menu-tags">
      {tags.map((t) => {
        if (t === "v")
          return (
            <span key="v" className="tag tag-v">
              Vegetarian
            </span>
          );
        if (t === "vg")
          return (
            <span key="vg" className="tag tag-v">
              Vegan
            </span>
          );
        if (t === "gf")
          return (
            <span key="gf" className="tag tag-gf">
              GF
            </span>
          );
        if (t === "sp")
          return (
            <span key="sp" className="tag tag-sp">
              🌶 Spicy
            </span>
          );
        if (t === "pop")
          return (
            <span key="pop" className="tag tag-pop">
              ⭐ Popular
            </span>
          );
        return null;
      })}
    </div>
  );
}

export function MenuSection() {
  const { items: menuItems } = useMenuItems();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<"all" | MenuCategory>("all");

  const query = search.toLowerCase().trim();

  const renderedCategories = useMemo(() => {
    const blocks: ReactNode[] = [];

    for (const cat of catOrder) {
      if (catFilter !== "all" && catFilter !== cat) continue;
      const cfg = categoryConfig[cat];
      const items = menuItems.filter((i) => {
        if (!i.available) return false;
        if (i.cat !== cat) return false;
        if (
          query &&
          !i.name.toLowerCase().includes(query) &&
          !i.desc.toLowerCase().includes(query)
        )
          return false;
        return true;
      });
      if (!items.length) continue;

      const header = (
        <div className="menu-cat-header" key={`h-${cat}`}>
          <span className="menu-cat-icon">{cfg.icon}</span>
          <div>
            <div className="menu-cat-title">{cfg.label}</div>
            {cfg.subtitle ? (
              <div className="menu-cat-subtitle">{cfg.subtitle}</div>
            ) : null}
          </div>
        </div>
      );

      blocks.push(
        <div className="menu-category" data-cat={cat} key={cat}>
          {header}
          <div className="menu-grid">
            {items.map((item) => {
              const allTags: string[] = [
                ...(item.tags || []),
                ...(item.popular ? ["pop"] : []),
              ];
              return (
                <div className="menu-card" key={item.id}>
                  <div className="menu-card-body">
                    <div className="menu-card-top">
                      <div className="menu-card-name">{item.name}</div>
                      <div className="menu-card-price">
                        £{item.price.toFixed(2)}
                      </div>
                    </div>
                    {item.desc ? (
                      <p className="menu-card-desc">{item.desc}</p>
                    ) : null}
                  </div>
                  <div className="menu-card-footer">
                    <TagList tags={allTags} />
                    <MenuAddButton
                      id={item.id}
                      name={item.name}
                      price={item.price}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>,
      );
    }

    return blocks;
  }, [menuItems, query, catFilter]);

  return (
    <section id="menu">
      <div className="container">
        <div className="menu-header">
          <span className="section-label">What We Serve</span>
          <h2>Our Full Menu</h2>
          <p>
            All dishes made to order — gluten-free pasta available on request
          </p>
        </div>

        <div className="menu-search-wrap">
          <input
            type="text"
            className="menu-search"
            placeholder="Search the menu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search menu"
          />
          <span className="menu-search-icon">🔍</span>
        </div>

        <div className="menu-tabs" id="menuTabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`menu-tab${catFilter === t.id ? " active" : ""}`}
              onClick={() => setCatFilter(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div id="menuContent">
          {renderedCategories.length ? (
            renderedCategories
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "60px 20px",
                color: "rgba(250,246,239,0.4)",
              }}
            >
              <div style={{ fontSize: "3rem", marginBottom: "14px" }}>🍽</div>
              <p>No items found matching your search.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
