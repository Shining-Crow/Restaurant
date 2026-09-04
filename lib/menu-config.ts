import type { MenuCategory } from "@/lib/menu-types";

export const categoryConfig: Record<
  MenuCategory,
  { label: string; icon: string; subtitle: string }
> = {
  starters: {
    label: "Starters",
    icon: "🥗",
    subtitle: "Begin your Italian journey",
  },
  pasta: {
    label: "Pasta",
    icon: "🍝",
    subtitle: "Gluten-free pasta available on request",
  },
  pizza: {
    label: 'Pizza — 12"',
    icon: "🍕",
    subtitle: "Thin base, tomato sauce & mozzarella",
  },
  chicken: {
    label: "Pollo & Carne",
    icon: "🍗",
    subtitle: "All served with fresh vegetables",
  },
  risotto: {
    label: "Risotto",
    icon: "🌾",
    subtitle: "Creamy Italian rice dishes",
  },
  crespelle: {
    label: "Crespelle",
    icon: "🥞",
    subtitle: "Fresh rolled pancakes, baked in the pizza oven",
  },
  burgers: {
    label: "Burgers",
    icon: "🍔",
    subtitle: "Homemade with fries",
  },
  bread: {
    label: "Pane — Bread",
    icon: "🫓",
    subtitle: "12\" pizza base — vegan option available on request",
  },
  sides: {
    label: "Contorni — Sides",
    icon: "🥬",
    subtitle: "",
  },
  kids: {
    label: "Kids Menu",
    icon: "⭐",
    subtitle: "All £8.95",
  },
};

export const catOrder: MenuCategory[] = [
  "starters",
  "pasta",
  "pizza",
  "chicken",
  "risotto",
  "crespelle",
  "burgers",
  "bread",
  "sides",
  "kids",
];
