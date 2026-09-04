import { Resend } from "resend";
import { loadSitePublicSettings } from "@/lib/site-settings-data";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

type EmailSendPayload = Parameters<Resend["emails"]["send"]>[0];

async function sendEmail(resend: Resend, payload: EmailSendPayload) {
  const result = await resend.emails.send(payload);
  if (result.error) {
    throw new Error(
      `${result.error.name}: ${result.error.message} (status ${result.error.statusCode ?? "unknown"})`,
    );
  }
  console.info("[resend] Email sent", result.data.id);
}

type OrderEmailPayload = {
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  orderType: string;
  deliveryAddress: string | null;
  preferredTime: string | null;
  notes: string | null;
  items: { name: string; qty: number; lineTotal: number }[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentReference: string;
};

type BookingEmailPayload = {
  bookingId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  bookingDate: string;
  bookingTime: string;
  guestCount: string;
  specialRequests: string | null;
};

function formatItemsHtml(items: OrderEmailPayload["items"]) {
  return items
    .map(
      (i) =>
        `<tr><td>${escapeHtml(i.name)}</td><td>${i.qty}</td><td>£${i.lineTotal.toFixed(2)}</td></tr>`,
    )
    .join("");
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatBookingDate(ymd: string) {
  const date = new Date(`${ymd}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return ymd;
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "full",
    timeZone: "UTC",
  }).format(date);
}

function orderBodyHtml(data: OrderEmailPayload) {
  return `
    <h1>New paid order</h1>
    <p><strong>Payment reference:</strong> ${escapeHtml(data.paymentReference)}</p>
    <p><strong>Name:</strong> ${escapeHtml(data.customerName)}</p>
    <p><strong>Phone:</strong> ${escapeHtml(data.customerPhone)}</p>
    <p><strong>Email:</strong> ${data.customerEmail ? escapeHtml(data.customerEmail) : "—"}</p>
    <p><strong>Type:</strong> ${escapeHtml(data.orderType)}</p>
    <p><strong>Address:</strong> ${data.deliveryAddress ? escapeHtml(data.deliveryAddress) : "—"}</p>
    <p><strong>Preferred time:</strong> ${data.preferredTime ? escapeHtml(data.preferredTime) : "—"}</p>
    <p><strong>Notes:</strong> ${data.notes ? escapeHtml(data.notes) : "—"}</p>
    <table border="1" cellpadding="6" cellspacing="0">
      <thead><tr><th>Item</th><th>Qty</th><th>Line</th></tr></thead>
      <tbody>${formatItemsHtml(data.items)}</tbody>
    </table>
    <p>Subtotal: £${data.subtotal.toFixed(2)} | Delivery: £${data.deliveryFee.toFixed(2)} | <strong>Total: £${data.total.toFixed(2)}</strong></p>
  `;
}

function bookingBodyHtml(data: BookingEmailPayload) {
  return `
    <h1>Table booking request</h1>
    <p><strong>Booking ID:</strong> ${escapeHtml(data.bookingId)}</p>
    <p><strong>Name:</strong> ${escapeHtml(data.customerName)}</p>
    <p><strong>Phone:</strong> ${escapeHtml(data.customerPhone)}</p>
    <p><strong>Email:</strong> ${escapeHtml(data.customerEmail)}</p>
    <p><strong>Date:</strong> ${escapeHtml(formatBookingDate(data.bookingDate))}</p>
    <p><strong>Time:</strong> ${escapeHtml(data.bookingTime)}</p>
    <p><strong>Guests:</strong> ${escapeHtml(data.guestCount)}</p>
    <p><strong>Special requests:</strong> ${data.specialRequests ? escapeHtml(data.specialRequests) : "—"}</p>
  `;
}

export async function sendRestaurantEmail(data: OrderEmailPayload) {
  const resend = getResend();
  const to = process.env.RESTAURANT_EMAIL;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!resend || !to || !from) {
    console.warn(
      "[resend] Skipping restaurant email: missing RESEND_API_KEY, RESTAURANT_EMAIL, or RESEND_FROM_EMAIL",
    );
    return;
  }
  const { restaurantName } = await loadSitePublicSettings();
  await sendEmail(resend, {
    from,
    to: [to],
    subject: `${restaurantName} — New order from ${data.customerName}`,
    html: orderBodyHtml(data),
  });
}

export async function sendCustomerPaymentSuccessEmail(data: OrderEmailPayload) {
  if (!data.customerEmail) {
    console.warn("[resend] Skipping customer success email: no customer email on order");
    return;
  }
  const resend = getResend();
  const from = process.env.RESEND_FROM_EMAIL;
  if (!resend || !from) {
    console.warn("[resend] Skipping customer success email: missing RESEND_API_KEY or RESEND_FROM_EMAIL");
    return;
  }
  const { restaurantName, phone } = await loadSitePublicSettings();
  await sendEmail(resend, {
    from,
    to: [data.customerEmail],
    subject: `${restaurantName} — Payment confirmed`,
    html: `
      <p>Hi ${escapeHtml(data.customerName)},</p>
      <p>Your payment was successful. We have received your order and will start preparing it.</p>
      ${orderBodyHtml(data)}
      <p>Questions? Call us on <strong>${escapeHtml(phone)}</strong>.</p>
    `,
  });
}

export async function sendCustomerPaymentFailedEmail(data: OrderEmailPayload) {
  if (!data.customerEmail) {
    console.warn("[resend] Skipping customer failure email: no customer email on order");
    return;
  }
  const resend = getResend();
  const from = process.env.RESEND_FROM_EMAIL;
  if (!resend || !from) {
    console.warn("[resend] Skipping customer failure email: missing RESEND_API_KEY or RESEND_FROM_EMAIL");
    return;
  }
  const { restaurantName, phone } = await loadSitePublicSettings();
  await sendEmail(resend, {
    from,
    to: [data.customerEmail],
    subject: `${restaurantName} — Payment not completed`,
    html: `
      <p>Hi ${escapeHtml(data.customerName)},</p>
      <p>Your card payment was not completed, so we have not taken payment for this order.</p>
      <p>You can try again from our website, or call us on <strong>${escapeHtml(phone)}</strong> to place your order by phone.</p>
      <p><strong>Order reference:</strong> ${escapeHtml(data.paymentReference)}</p>
      <p><strong>Preferred time:</strong> ${data.preferredTime ? escapeHtml(data.preferredTime) : "—"}</p>
      <p><strong>Order type:</strong> ${escapeHtml(data.orderType)}</p>
    `,
  });
}

export async function sendRestaurantCashOrderEmail(data: OrderEmailPayload) {
  const resend = getResend();
  const to = process.env.RESTAURANT_EMAIL;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!resend || !to || !from) {
    console.warn(
      "[resend] Skipping restaurant cash-order email: missing RESEND_API_KEY, RESTAURANT_EMAIL, or RESEND_FROM_EMAIL",
    );
    return;
  }
  const { restaurantName } = await loadSitePublicSettings();
  const when =
    data.orderType === "delivery"
      ? "Collect cash on delivery"
      : "Collect cash on collection";
  await sendEmail(resend, {
    from,
    to: [to],
    subject: `${restaurantName} — New cash order from ${data.customerName}`,
    html: `
      <h1>New cash order</h1>
      <p><strong>${escapeHtml(when)}.</strong> No card payment has been taken online.</p>
      ${orderBodyHtml(data)}
    `,
  });
}

export async function sendCustomerCashOrderEmail(data: OrderEmailPayload) {
  if (!data.customerEmail) {
    console.warn("[resend] Skipping customer cash-order email: no customer email on order");
    return;
  }
  const resend = getResend();
  const from = process.env.RESEND_FROM_EMAIL;
  if (!resend || !from) {
    console.warn(
      "[resend] Skipping customer cash-order email: missing RESEND_API_KEY or RESEND_FROM_EMAIL",
    );
    return;
  }
  const { restaurantName, phone } = await loadSitePublicSettings();
  const payWhen =
    data.orderType === "delivery"
      ? "Please have cash ready to pay when your order is delivered."
      : "Please bring cash to pay when you collect your order.";
  await sendEmail(resend, {
    from,
    to: [data.customerEmail],
    subject: `${restaurantName} — Order received (pay cash)`,
    html: `
      <p>Hi ${escapeHtml(data.customerName)},</p>
      <p>We have received your order. ${escapeHtml(payWhen)}</p>
      ${orderBodyHtml(data)}
      <p>Questions? Call us on <strong>${escapeHtml(phone)}</strong>.</p>
    `,
  });
}

export async function sendRestaurantBookingEmail(data: BookingEmailPayload) {
  const resend = getResend();
  const to = process.env.RESTAURANT_EMAIL;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!resend || !to || !from) {
    console.warn(
      "[resend] Skipping restaurant booking email: missing RESEND_API_KEY, RESTAURANT_EMAIL, or RESEND_FROM_EMAIL",
    );
    return;
  }
  const { restaurantName } = await loadSitePublicSettings();
  await sendEmail(resend, {
    from,
    to: [to],
    subject: `${restaurantName} - New table booking from ${data.customerName}`,
    html: bookingBodyHtml(data),
  });
}

export async function sendCustomerBookingEmail(data: BookingEmailPayload) {
  const resend = getResend();
  const from = process.env.RESEND_FROM_EMAIL;
  if (!resend || !from) {
    console.warn("[resend] Skipping customer booking email: missing RESEND_API_KEY or RESEND_FROM_EMAIL");
    return;
  }
  const { restaurantName, phone } = await loadSitePublicSettings();
  await sendEmail(resend, {
    from,
    to: [data.customerEmail],
    subject: `${restaurantName} - We received your table booking request`,
    html: `
      <p>Hi ${escapeHtml(data.customerName)},</p>
      <p>Thanks for your booking request. We have received your details and will contact you if we need anything else.</p>
      ${bookingBodyHtml(data)}
      <p>Questions? Call us on <strong>${escapeHtml(phone)}</strong>.</p>
    `,
  });
}
