/** Build lowercase hex ESC/POS for SUNMI cloud pushContent. */

function textHex(text: string): string {
  return Buffer.from(text, "utf8").toString("hex");
}

function line(text: string): string {
  return textHex(`${text}\n`);
}

function divider(): string {
  return line("--------------------------------");
}

export type KitchenTicketOrder = {
  paymentReference: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  orderType: string;
  deliveryAddress?: string | null;
  preferredTime?: string | null;
  notes?: string | null;
  items: { name: string; qty: number; lineTotal: number }[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: string;
  createdAt?: Date | string | null;
};

function money(n: number): string {
  return `£${n.toFixed(2)}`;
}

function formatWhen(d?: Date | string | null): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function buildKitchenTicketHex(
  order: KitchenTicketOrder,
  opts?: { reprint?: boolean },
): string {
  const paymentLabel =
    order.status === "awaiting_cash" ? "CASH (pay on arrival)" : "CARD (paid)";

  let out = "";
  // ESC @ init + ESC 2 default line spacing
  out += "1b401b32";
  // Center + double size + bold title
  out += "1b6101"; // align center
  out += "1d2111"; // GS ! double width+height
  out += "1b4501"; // bold on
  out += line("AMORE MIO");
  out += "1b4500";
  out += "1d2100"; // normal size
  out += line("Clay Cross Takeaway");
  if (opts?.reprint) {
    out += line("*** REPRINT ***");
  }
  out += "1b6100"; // left
  out += divider();

  out += line(`Order: ${order.paymentReference}`);
  const when = formatWhen(order.createdAt);
  if (when) out += line(`Placed: ${when}`);
  out += line(`Type: ${order.orderType.toUpperCase()}`);
  out += line(`Pay: ${paymentLabel}`);
  if (order.preferredTime) out += line(`Time: ${order.preferredTime}`);
  out += divider();

  out += line(`Name: ${order.customerName}`);
  out += line(`Phone: ${order.customerPhone}`);
  if (order.customerEmail) out += line(`Email: ${order.customerEmail}`);
  if (order.orderType === "delivery" && order.deliveryAddress) {
    out += line("Address:");
    for (const part of order.deliveryAddress.split(/\r?\n/)) {
      if (part.trim()) out += line(part.trim());
    }
  }
  out += divider();

  for (const item of order.items) {
    out += line(`${item.qty}x ${item.name}`);
    out += line(`    ${money(item.lineTotal)}`);
  }
  out += divider();

  out += line(`Subtotal: ${money(order.subtotal)}`);
  if (order.deliveryFee > 0) {
    out += line(`Delivery: ${money(order.deliveryFee)}`);
  }
  out += "1b4501";
  out += line(`TOTAL: ${money(order.total)}`);
  out += "1b4500";

  if (order.notes?.trim()) {
    out += divider();
    out += line("NOTES:");
    out += line(order.notes.trim());
  }

  out += divider();
  out += "1b6101";
  out += line("Thank you!");
  out += "1b6100";
  // Feed + partial cut
  out += "0a0a0a";
  out += "1d5600";

  return out;
}

export function kitchenVoiceText(order: KitchenTicketOrder): string {
  const type =
    order.orderType === "delivery" ? "delivery" : "collection";
  return `New ${type} order for ${order.customerName}`;
}
