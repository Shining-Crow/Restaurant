import { getSunmiConfig } from "@/lib/sunmi/config";
import { sunmiHmacHeaders } from "@/lib/sunmi/sign";

export type SunmiApiResult = {
  ok: boolean;
  httpStatus: number;
  code?: string | number;
  msg?: string;
  raw: unknown;
};

async function sunmiPost(
  path: string,
  body: Record<string, unknown>,
): Promise<SunmiApiResult> {
  const config = getSunmiConfig();
  if (!config) {
    return {
      ok: false,
      httpStatus: 0,
      msg: "SUNMI is not configured",
      raw: null,
    };
  }

  const bodyJson = JSON.stringify(body);
  const headers = {
    ...sunmiHmacHeaders(config.appId, config.appKey, bodyJson),
    Source: "openapi",
    "Content-Type": "application/json",
  };

  const res = await fetch(`${config.baseUrl}${path}`, {
    method: "POST",
    headers,
    body: bodyJson,
  });

  let raw: unknown = null;
  try {
    raw = await res.json();
  } catch {
    raw = null;
  }

  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const code = obj.code as string | number | undefined;
  const msg =
    typeof obj.msg === "string"
      ? obj.msg
      : typeof obj.message === "string"
        ? obj.message
        : undefined;

  const codeOk =
    code === undefined ||
    code === 1 ||
    code === "1" ||
    code === 10000 ||
    code === "10000" ||
    code === 0 ||
    code === "0";

  return {
    ok: res.ok && codeOk,
    httpStatus: res.status,
    code,
    msg,
    raw,
  };
}

/** Direct-push kitchen ticket (hex ESC/POS content). */
export async function pushPrintContent(input: {
  sn: string;
  tradeNo: string;
  contentHex: string;
  mediaText?: string;
  count?: number;
  orderType?: number;
  cycle?: number;
}): Promise<SunmiApiResult> {
  const body: Record<string, unknown> = {
    sn: input.sn,
    trade_no: input.tradeNo,
    content: input.contentHex,
    count: input.count ?? 1,
  };
  if (input.mediaText) body.media_text = input.mediaText;
  if (input.orderType != null) body.order_type = input.orderType;
  if (input.cycle != null) body.cycle = input.cycle;

  return sunmiPost("/v2/printer/open/open/device/pushContent", body);
}

export async function queryTicketPrintStatus(
  tradeNo: string,
): Promise<SunmiApiResult> {
  return sunmiPost("/v2/printer/open/open/ticket/printStatus", {
    trade_no: tradeNo,
  });
}

export async function bindPrinterToShop(
  sn: string,
  shopId: number,
): Promise<SunmiApiResult> {
  return sunmiPost("/v2/printer/open/open/device/bindShop", {
    sn,
    shop_id: shopId,
  });
}
