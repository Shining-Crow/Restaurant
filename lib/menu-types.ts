export type MenuCategory =
  | "starters"
  | "pasta"
  | "pizza"
  | "chicken"
  | "risotto"
  | "crespelle"
  | "burgers"
  | "bread"
  | "sides"
  | "kids";

export interface MenuItem {
  id: number;
  name: string;
  desc: string;
  price: number;
  cat: MenuCategory;
  tags: string[];
  available: boolean;
  popular: boolean;
  img: string;
  extras?: string;
}
