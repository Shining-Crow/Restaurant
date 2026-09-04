import { NextResponse } from "next/server";
import { getWorldpayConfig, isWorldpayConfigured } from "@/lib/worldpay/config";

export const runtime = "nodejs";

const HPP_MEDIA = "application/vnd.worldpay.payment_pages-v1.hal+json";

export async function GET() {
  if (!isWorldpayConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: "Worldpay env vars are missing (username, password, or entity).",
      },
      { status: 503 },
    );
  }

  const config = getWorldpayConfig();
  if (!config) {
    return NextResponse.json({ ok: false, error: "Worldpay not configured." }, { status: 503 });
  }

  const auth =
    "Basic " +
    Buffer.from(`${config.username}:${config.password}`).toString("base64");

  const probeBody = JSON.stringify({
    transactionReference: "ord_probe00000000000000000001",
    merchant: { entity: config.entity },
    narrative: { line1: config.narrativeLine1 },
    value: { currency: "GBP", amount: 100 },
    resultURLs: {
      successURL: "https://example.com/success",
      failureURL: "https://example.com/failure",
      cancelURL: "https://example.com/cancel",
    },
  });

  try {
    const res = await fetch(`${config.apiBaseUrl}/payment_pages`, {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": HPP_MEDIA,
        Accept: HPP_MEDIA,
        "User-Agent": "AmoreMio-Website/1.0 (Worldpay-HPP-probe)",
      },
      body: probeBody,
    });

    const bodyText = await res.text();
    const supportRef = bodyText
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
      .match(/Reference\s*#\s*([\d.a-f]+)/i)?.[1];

    if (res.ok && bodyText.trimStart().startsWith("{")) {
      return NextResponse.json({
        ok: true,
        message: "Worldpay HPP API accepted the request.",
        apiBaseUrl: config.apiBaseUrl,
        entity: config.entity,
      });
    }

    return NextResponse.json({
      ok: false,
      status: res.status,
      apiBaseUrl: config.apiBaseUrl,
      entity: config.entity,
      supportReference: supportRef,
      hint:
        res.status === 403
          ? "403 from Worldpay edge — HPP API not enabled or wrong Try credentials. Use dashboard.worldpay.com → Developer Tools → API Credentials → Try mode."
          : "Unexpected Worldpay response — contact Worldpay support with the supportReference.",
      bodyPreview: bodyText.slice(0, 200),
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Probe request failed",
        apiBaseUrl: config.apiBaseUrl,
        entity: config.entity,
      },
      { status: 502 },
    );
  }
}
