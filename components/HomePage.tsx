"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AdminPanel } from "@/components/AdminPanel";
import { MenuSection } from "@/components/MenuSection";
import { StickyBasketButton } from "@/components/StickyBasketButton";
import { TakeawayCheckout } from "@/components/TakeawayCheckout";
import { useSiteSettings } from "@/components/SiteSettingsContext";
import type { OpeningHourDisplay } from "@/lib/opening-hours-shared";
import { formatOpeningHourSlot, prismaWeekdayFromJsDate } from "@/lib/opening-hours-shared";
import { scrollToSection } from "@/lib/scroll";

function NavLink({
  children,
  sectionId,
  onPick,
  className,
}: {
  children: React.ReactNode;
  sectionId: string;
  onPick?: () => void;
  className?: string;
}) {
  return (
    <a
      href={`#${sectionId}`}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        scrollToSection(sectionId);
        onPick?.();
      }}
    >
      {children}
    </a>
  );
}

export function HomePage({ openingHours }: { openingHours: OpeningHourDisplay[] }) {
  const site = useSiteSettings();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const [todayWeekday, setTodayWeekday] = useState<number | null>(null);

  useEffect(() => {
    document.body.style.overflow = mobileOpen || adminOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen, adminOpen]);

  useEffect(() => {
    setTodayWeekday(prismaWeekdayFromJsDate());
  }, []);

  const year = new Date().getFullYear();

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (id: string) => {
    scrollToSection(id);
    setMobileOpen(false);
  };

  return (
    <>
      <nav id="navbar" className={navScrolled ? "scrolled" : ""}>
        <div className="container nav-inner">
          <div
            className="nav-logo"
            role="button"
            tabIndex={0}
            onClick={() => scrollToSection("hero")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") scrollToSection("hero");
            }}
          >
            <div className="nav-logo-name">{site.restaurantName}</div>
            <div className="nav-logo-tagline">{site.restaurantTagline}</div>
          </div>
          <ul className="nav-links">
            <li>
              <NavLink sectionId="about">About</NavLink>
            </li>
            <li>
              <NavLink sectionId="menu">Menu</NavLink>
            </li>
            <li>
              <NavLink sectionId="order">Order</NavLink>
            </li>
            <li>
              <NavLink sectionId="specials">Specials</NavLink>
            </li>
            <li>
              <NavLink sectionId="gallery">Gallery</NavLink>
            </li>
            <li>
              <NavLink sectionId="contact">Contact</NavLink>
            </li>
          </ul>
          <button
            type="button"
            className={`hamburger${mobileOpen ? " open" : ""}`}
            aria-label="Menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((o) => !o)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </nav>

      <div id="mobile-menu" className={mobileOpen ? "open" : ""}>
        <button
          type="button"
          className="mobile-close"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        >
          ✕
        </button>
        <a href="#about" onClick={() => go("about")}>
          About
        </a>
        <div className="mobile-divider" />
        <a href="#menu" onClick={() => go("menu")}>
          Menu
        </a>
        <div className="mobile-divider" />
        <a href="#specials" onClick={() => go("specials")}>
          Specials
        </a>
        <div className="mobile-divider" />
        <a href="#gallery" onClick={() => go("gallery")}>
          Gallery
        </a>
        <div className="mobile-divider" />
        <a href="#order" onClick={() => go("order")}>
          Order Takeaway
        </a>
        <div className="mobile-divider" />
        <a href="#contact" onClick={() => go("contact")}>
          Contact
        </a>
      </div>

      <section id="hero">
        <div className="hero-bg" />
        <div className="hero-texture" />
        <div className="container">
          <div className="hero-content">
            <div className="hero-eyebrow">
              <div className="hero-eyebrow-line" />
              <span className="hero-eyebrow-text">Clay Cross, Derbyshire</span>
            </div>
            <h1 className="hero-h1">
              Authentic Italian Food,
              <br />
              <em>Made Fresh Every Day</em>
            </h1>
            <p className="hero-sub">
              Fresh pasta, stone-baked pizzas, classic Italian dishes and
              takeaway favourites — all served with passion from our kitchen to
              your table.
            </p>
            <div className="hero-btns">
              <button
                type="button"
                className="btn-primary"
                onClick={() => scrollToSection("menu")}
              >
                📖 View Full Menu
              </button>
              <button
                type="button"
                className="btn-gold"
                onClick={() => scrollToSection("order")}
              >
                📦 Order Takeaway
              </button>
            </div>
            <div className="hero-trust">
              <div className="trust-item">
                <div className="trust-icon">🌿</div>
                <span className="trust-text">Fresh Ingredients</span>
              </div>
              <div className="trust-item">
                <div className="trust-icon">👨‍🍳</div>
                <span className="trust-text">Family Recipes</span>
              </div>
              <div className="trust-item">
                <div className="trust-icon">🏠</div>
                <span className="trust-text">Takeaway & Collection</span>
              </div>
              <div className="trust-item">
                <div className="trust-icon">🛵</div>
                <span className="trust-text">Local Collection</span>
              </div>
              <div className="trust-item">
                <div className="trust-icon">💳</div>
                <span className="trust-text">Card Payments Taken</span>
              </div>
            </div>
          </div>
        </div>
        <div className="hero-scroll">
          <div className="scroll-line" />
          <span>Scroll</span>
        </div>
      </section>

      <div className="announce-bar">
        <p>
          {site.announcementBar}{" "}
          <a
            href="#order"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection("order");
            }}
          >
            Order now →
          </a>
        </p>
      </div>

      <div className="info-strip">
        <div className="container info-strip-inner">
          <div className="info-strip-item">
            <span className="info-strip-icon">📍</span>
            <div className="info-strip-content">
              <div className="info-strip-label">Address</div>
              <div className="info-strip-value">{site.addressSingleLine}</div>
            </div>
          </div>
          <div className="info-strip-item">
            <span className="info-strip-icon">📞</span>
            <div className="info-strip-content">
              <div className="info-strip-label">Phone</div>
              <div className="info-strip-value">
                <a href={site.phoneTelHref}>{site.phone}</a>
              </div>
            </div>
          </div>
          <div className="info-strip-item">
            <span className="info-strip-icon">🕓</span>
            <div className="info-strip-content">
              <div className="info-strip-label">{site.hoursStripWeekdayLabel}</div>
              <div className="info-strip-value">{site.hoursStripWeekdayTime}</div>
            </div>
          </div>
          <div className="info-strip-item">
            <span className="info-strip-icon">🕚</span>
            <div className="info-strip-content">
              <div className="info-strip-label">{site.hoursStripWeekendLabel}</div>
              <div className="info-strip-value">{site.hoursStripWeekendTime}</div>
            </div>
          </div>
          <div className="info-strip-item">
            <span className="info-strip-icon">💳</span>
            <div className="info-strip-content">
              <div className="info-strip-label">Payments</div>
              <div className="info-strip-value">Cash & Card Accepted</div>
            </div>
          </div>
        </div>
      </div>

      <section id="about">
        <div className="container">
          <div className="about-grid">
            <div className="about-images">
              <div className="about-img-main">
                <Image
                  src="https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?w=800&q=80"
                  alt="Our restaurant interior"
                  fill
                  sizes="(max-width: 768px) 90vw, 35vw"
                  style={{ objectFit: "cover" }}
                  unoptimized
                />
              </div>
              <div className="about-img-accent">
                <Image
                  src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80"
                  alt="Fresh Italian pizza"
                  fill
                  sizes="(max-width: 768px) 70vw, 28vw"
                  style={{ objectFit: "cover" }}
                  unoptimized
                />
              </div>
              <div className="about-badge">
                <div className="about-badge-num">★</div>
                <div className="about-badge-text">Loved Locally</div>
              </div>
            </div>
            <div className="about-text">
              <span className="section-label">Our Story</span>
              <h2 className="about-h2">
                Where Every Dish Tells a <em>Story</em>
              </h2>
              <p className="about-intro">
                A taste of Italy, right here in the heart of Clay Cross.
              </p>
              <p className="about-body">
                At {site.restaurantName}, we believe food is more than nourishment —
                it&apos;s an experience. Our kitchen brings together the very
                best of Italian cooking: time-honoured family recipes, the finest
                fresh ingredients, and an unwavering passion for getting every
                dish just right.
              </p>
              <p className="about-body">
                Whether you&apos;re joining us for a relaxed dinner with loved
                ones, or calling ahead for a takeaway on a quiet evening, every
                meal we serve carries the same care and love. From our
                hand-stretched pizzas to our rich, slow-simmered sauces — this
                is the real Italian experience.
              </p>
              <div className="about-pillars">
                <div className="pillar">
                  <div className="pillar-icon">🍝</div>
                  <div className="pillar-title">Fresh Every Day</div>
                  <div className="pillar-desc">
                    All pasta, sauces and dough prepared fresh in our kitchen
                    daily.
                  </div>
                </div>
                <div className="pillar">
                  <div className="pillar-icon">🫒</div>
                  <div className="pillar-title">Authentic Recipes</div>
                  <div className="pillar-desc">
                    Traditional Italian methods passed down through generations.
                  </div>
                </div>
                <div className="pillar">
                  <div className="pillar-icon">🍕</div>
                  <div className="pillar-title">Stone-Baked Pizzas</div>
                  <div className="pillar-desc">
                    Thin crust, crispy base, loaded with the finest toppings.
                  </div>
                </div>
                <div className="pillar">
                  <div className="pillar-icon">🤝</div>
                  <div className="pillar-title">Community Favourite</div>
                  <div className="pillar-desc">
                    Serving the Clay Cross community with pride and passion.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <MenuSection />

      <section id="order">
        <div className="container">
          <div className="order-grid">
            <div className="order-text">
              <span className="section-label" style={{ color: "var(--crimson)" }}>
                Takeaway & Collection
              </span>
              <h2>
                Order <em>Tonight</em>
              </h2>
              <p>
                Can&apos;t make it in? No problem — our full menu is available for
                takeaway and collection. Add dishes to your basket, then pay by
                card online or choose cash when you collect or receive delivery.
              </p>
              <ol className="order-steps">
                <li className="order-step">
                  <div className="step-num">1</div>
                  <div className="step-content">
                    <div className="step-title">Choose Your Dishes</div>
                    <div className="step-desc">
                      Browse our full menu above and tap + Add on what you&apos;d
                      like.
                    </div>
                  </div>
                </li>
                <li className="order-step">
                  <div className="step-num">2</div>
                  <div className="step-content">
                    <div className="step-title">Checkout</div>
                    <div className="step-desc">
                      Enter your details and choose card payment online or cash
                      on collection / delivery.
                    </div>
                  </div>
                </li>
                <li className="order-step">
                  <div className="step-num">3</div>
                  <div className="step-content">
                    <div className="step-title">We Prepare</div>
                    <div className="step-desc">
                      We&apos;ll get your order ready for your preferred time.
                    </div>
                  </div>
                </li>
                <li className="order-step">
                  <div className="step-num">4</div>
                  <div className="step-content">
                    <div className="step-title">Collect or Delivery</div>
                    <div className="step-desc">
                      Pick up from {site.addressSingleLine}, or we&apos;ll bring
                      it to you — freshly made to order.
                    </div>
                  </div>
                </li>
              </ol>
              <div className="order-cta-call">
                <div className="order-cta-call-icon">📞</div>
                <div className="order-cta-call-text">
                  <div className="order-cta-call-label">Call to Order Directly</div>
                  <div className="order-cta-call-num">
                    <a href={site.phoneTelHref} style={{ color: "inherit" }}>
                      {site.phone}
                    </a>
                  </div>
                </div>
              </div>
            </div>
            <TakeawayCheckout />
          </div>
        </div>
      </section>

      <section id="specials">
        <div className="specials-bg-decor" />
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "14px" }}>
            <span className="section-label" style={{ color: "var(--crimson)" }}>
              Limited Time
            </span>
            <h2 style={{ fontSize: "2.6rem", color: "var(--text-dark)" }}>
              Chef&apos;s Specials & Offers
            </h2>
            <p
              style={{
                fontFamily: "var(--font-cormorant), 'Cormorant Garamond', serif",
                fontStyle: "italic",
                fontSize: "1.1rem",
                color: "var(--text-light)",
                marginTop: "10px",
              }}
            >
              Exceptional dishes, crafted with the finest seasonal ingredients
            </p>
          </div>
          <div className="specials-grid">
            <div className="special-card">
              <div className="special-card-img">
                <Image
                  src="https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=700&q=80"
                  alt="Seafood pasta"
                  fill
                  sizes="(max-width: 768px) 100vw, 45vw"
                  style={{ objectFit: "cover" }}
                  unoptimized
                />
              </div>
              <div className="special-card-body">
                <span className="special-ribbon">🌊 Chef&apos;s Pick</span>
                <h3 className="special-title">Linguine Allo Scoglio</h3>
                <p className="special-desc">
                  Mixed seafood in white wine, garlic, fresh tomatoes and a
                  touch of cream — the taste of the Italian coast in every
                  forkful.
                </p>
                <div className="special-price-row">
                  <span className="special-price">£14.95</span>
                </div>
              </div>
            </div>
            <div className="special-card">
              <div className="special-card-img">
                <Image
                  src="https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=700&q=80"
                  alt="Pollo special"
                  fill
                  sizes="(max-width: 768px) 100vw, 45vw"
                  style={{ objectFit: "cover" }}
                  unoptimized
                />
              </div>
              <div className="special-card-body">
                <span className="special-ribbon">🔥 Most Popular</span>
                <h3 className="special-title">Pollo Cacciatora</h3>
                <p className="special-desc">
                  Chicken braised in red wine with olives, garlic, mushrooms,
                  peppers and fresh thyme. A true Italian classic done to
                  perfection.
                </p>
                <div className="special-price-row">
                  <span className="special-price">£15.95</span>
                </div>
              </div>
            </div>
          </div>
          <div className="cta-banner">
            <div className="cta-banner-text">
              <div className="cta-banner-eyebrow">Hungry? Don&apos;t wait.</div>
              <h2 className="cta-banner-h2">Ready to Order?</h2>
              <p className="cta-banner-sub">
                Call us to place your takeaway or collection order — we&apos;re
                open every evening from 4pm. Card payments welcome.
              </p>
            </div>
            <div className="cta-banner-btns">
              <a href={site.phoneTelHref} className="btn-gold">
                📞 Call {site.phone}
              </a>
              <button
                type="button"
                className="btn-outline"
                onClick={() => scrollToSection("order")}
              >
                Basket &amp; Pay
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="gallery">
        <div className="container">
          <div className="gallery-header">
            <span className="section-label" style={{ color: "var(--crimson)" }}>
              Our Kitchen & Dining
            </span>
            <h2 style={{ fontSize: "2.6rem", color: "var(--text-dark)" }}>
              A Feast for the Eyes
            </h2>
            <p
              style={{
                fontFamily: "var(--font-cormorant), 'Cormorant Garamond', serif",
                fontStyle: "italic",
                fontSize: "1.1rem",
                color: "var(--text-light)",
                marginTop: "10px",
              }}
            >
              Every dish prepared with love, every moment worth savouring
            </p>
          </div>
          <div className="gallery-grid">
            <div className="gallery-item g-span-4 g-row-2">
              <Image
                src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80"
                alt="Restaurant atmosphere"
                fill
                sizes="(max-width: 768px) 100vw, 40vw"
                style={{ objectFit: "cover" }}
                unoptimized
              />
              <div className="gallery-item-overlay">
                <span className="gallery-item-label">Our Dining Room</span>
              </div>
            </div>
            <div className="gallery-item g-span-4">
              <Image
                src="https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&q=80"
                alt="Pasta dish"
                fill
                sizes="(max-width: 768px) 50vw, 30vw"
                style={{ objectFit: "cover" }}
                unoptimized
              />
              <div className="gallery-item-overlay">
                <span className="gallery-item-label">Fresh Pasta</span>
              </div>
            </div>
            <div className="gallery-item g-span-4">
              <Image
                src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80"
                alt="Pizza"
                fill
                sizes="(max-width: 768px) 50vw, 30vw"
                style={{ objectFit: "cover" }}
                unoptimized
              />
              <div className="gallery-item-overlay">
                <span className="gallery-item-label">Stone-Baked Pizza</span>
              </div>
            </div>
            <div className="gallery-item g-span-3">
              <Image
                src="https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?w=600&q=80"
                alt="Bruschetta starter"
                fill
                sizes="(max-width: 768px) 50vw, 28vw"
                style={{ objectFit: "cover" }}
                unoptimized
              />
              <div className="gallery-item-overlay">
                <span className="gallery-item-label">Bruschetta</span>
              </div>
            </div>
            <div className="gallery-item g-span-3">
              <Image
                src="https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600&q=80"
                alt="Italian dessert"
                fill
                sizes="(max-width: 768px) 50vw, 28vw"
                style={{ objectFit: "cover" }}
                unoptimized
              />
              <div className="gallery-item-overlay">
                <span className="gallery-item-label">Dolci</span>
              </div>
            </div>
            <div className="gallery-item g-span-6">
              <Image
                src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=900&q=80"
                alt="Restaurant table setting"
                fill
                sizes="(max-width: 768px) 100vw, 55vw"
                style={{ objectFit: "cover" }}
                unoptimized
              />
              <div className="gallery-item-overlay">
                <span className="gallery-item-label">Table for Two</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="contact">
        <div className="container">
          <div className="contact-header">
            <span className="section-label">Get in Touch</span>
            <h2>Find Us</h2>
            <p>We&apos;re right in the heart of Clay Cross — come say hello</p>
          </div>
          <div className="contact-grid">
            <div className="contact-details">
              <div className="contact-block">
                <div className="contact-block-title">Address</div>
                <p>
                  {site.addressLines.map((line, i) => (
                    <span key={`${i}-${line}`}>
                      {i > 0 ? <br /> : null}
                      {line}
                    </span>
                  ))}
                </p>
              </div>
              <div className="contact-block">
                <div className="contact-block-title">Contact</div>
                <p>
                  📞 <a href={site.phoneTelHref}>{site.phone}</a>
                </p>
                <p style={{ marginTop: "6px" }}>
                  📧 <a href={site.emailMailtoHref}>{site.email}</a>
                </p>
              </div>
              <div className="contact-block">
                <div className="contact-block-title">Opening Hours</div>
                <table className="hours-table">
                  <tbody>
                    {openingHours.length ? (
                      openingHours.map((row) => (
                        <tr
                          key={row.weekday}
                          id={
                            row.weekday === 5
                              ? "fri-row"
                              : row.weekday === 6
                                ? "sat-row"
                                : undefined
                          }
                          className={
                            todayWeekday != null && todayWeekday === row.weekday
                              ? "hours-today"
                              : undefined
                          }
                        >
                          <td>{row.label}</td>
                          <td>{formatOpeningHourSlot(row)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} style={{ opacity: 0.65 }}>
                          Hours are not available online yet — please call{" "}
                          <a href={site.phoneTelHref}>{site.phone}</a>.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="contact-block">
                <div className="contact-block-title">Follow Us</div>
                <div className="social-links">
                  <a href="#" className="social-link" aria-label="Facebook">
                    f
                  </a>
                  <a
                    href="#"
                    className="social-link"
                    aria-label="Instagram"
                    style={{ fontStyle: "normal", fontSize: "1.1rem" }}
                  >
                    📷
                  </a>
                  <a
                    href="#"
                    className="social-link"
                    aria-label="TripAdvisor"
                    style={{ fontSize: "1rem" }}
                  >
                    🦉
                  </a>
                </div>
              </div>
            </div>
            <div className="map-placeholder">
              <div className="map-placeholder-mock">
                <div className="map-icon">🗺</div>
                <strong style={{ color: "rgba(250,246,239,0.5)", fontSize: "1rem" }}>
                  {site.addressSingleLine}
                </strong>
                <span style={{ fontSize: "0.82rem" }}>
                  Google Maps embed goes here
                </span>
                <a
                  href={site.addressMapsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--gold)", fontSize: "0.82rem", marginTop: "6px" }}
                >
                  Open in Google Maps →
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer>
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <div className="footer-logo-name">{site.restaurantName}</div>
              <div className="footer-logo-tagline">{site.restaurantTagline}</div>
              <p className="footer-brand-text">
                Bringing authentic Italian flavours to Clay Cross since day one.
                Freshly prepared dishes, family recipes, and warm hospitality —
                every single evening.
              </p>
            </div>
            <div className="footer-col">
              <h4>Navigate</h4>
              <ul className="footer-links">
                <li>
                  <a href="#about" onClick={(e) => { e.preventDefault(); scrollToSection("about"); }}>About Us</a>
                </li>
                <li>
                  <a href="#menu" onClick={(e) => { e.preventDefault(); scrollToSection("menu"); }}>Full Menu</a>
                </li>
                <li>
                  <a href="#specials" onClick={(e) => { e.preventDefault(); scrollToSection("specials"); }}>Specials & Offers</a>
                </li>
                <li>
                  <a href="#gallery" onClick={(e) => { e.preventDefault(); scrollToSection("gallery"); }}>Gallery</a>
                </li>
                <li>
                  <a href="#order" onClick={(e) => { e.preventDefault(); scrollToSection("order"); }}>Order Takeaway</a>
                </li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Hours</h4>
              <ul className="footer-links" style={{ pointerEvents: "none" }}>
                {openingHours.length ? (
                  openingHours.map((row) => (
                    <li key={row.weekday}>
                      <span style={{ color: "inherit" }}>
                        {row.label.slice(0, 3)}: {formatOpeningHourSlot(row)}
                      </span>
                    </li>
                  ))
                ) : (
                  <li>
                    <span style={{ color: "inherit" }}>See contact for hours</span>
                  </li>
                )}
              </ul>
              <div style={{ marginTop: "20px" }}>
                <h4>Takeaway</h4>
                <ul className="footer-links">
                  <li>
                    <a href={site.phoneTelHref}>📞 {site.phone}</a>
                  </li>
                </ul>
              </div>
            </div>
            <div className="footer-col">
              <h4>Contact</h4>
              <div className="footer-contact-item">
                <span className="footer-contact-icon">📍</span>
                <div className="footer-contact-text">
                  {site.addressLines.map((line, i) => (
                    <span key={`${i}-${line}`}>
                      {i > 0 ? <br /> : null}
                      {line}
                    </span>
                  ))}
                </div>
              </div>
              <div className="footer-contact-item">
                <span className="footer-contact-icon">📞</span>
                <div className="footer-contact-text">
                  <a href={site.phoneTelHref}>{site.phone}</a>
                </div>
              </div>
              <div className="footer-contact-item">
                <span className="footer-contact-icon">💳</span>
                <div className="footer-contact-text">Card payments accepted</div>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p className="footer-bottom-text">
              © {year} {site.restaurantName} — {site.restaurantTagline}. All rights
              reserved. |{" "}
              <a href="#">Privacy Policy</a>
            </p>
            <button
              type="button"
              className="footer-admin-link"
              onClick={() => setAdminOpen(true)}
            >
              ⚙ Staff Portal
            </button>
          </div>
        </div>
      </footer>

      <StickyBasketButton />
      <AdminPanel open={adminOpen} onClose={() => setAdminOpen(false)} />
    </>
  );
}
