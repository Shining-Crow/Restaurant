export function scrollToSection(id: string): void {
  const el = document.getElementById(id);
  if (!el) return;
  const offset = id === "hero" ? 0 : 80;
  const top = el.getBoundingClientRect().top + window.pageYOffset - offset;
  window.scrollTo({ top, behavior: "smooth" });
}
