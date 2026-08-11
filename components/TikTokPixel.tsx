import crypto from "crypto";

// ============================================================
// إعدادات أساسية — خذيها من TikTok Events Manager
// خزنيهم في Vercel > Project Settings > Environment Variables
//   NEXT_PUBLIC_TIKTOK_PIXEL_ID
//   TIKTOK_ACCESS_TOKEN
// ============================================================

const TIKTOK_API_URL = "https://business-api.tiktok.com/open_api/v1.3/event/track/";

// تشفير SHA-256 لأي بيانات شخصية (إيميل/جوال) — TikTok يطلبها مشفرة، أبدًا خام
function sha256(value: string): string {
  return crypto
    .createHash("sha256")
    .update(value.trim().toLowerCase())
    .digest("hex");
}

// تنسيق رقم الجوال السعودي لصيغة E.164 قبل التشفير (مثال: 966501234567)
function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "966" + digits.slice(1);
  if (!digits.startsWith("966")) digits = "966" + digits;
  return "+" + digits;
}

export interface UserData {
  email?: string;
  phone?: string;
  external_id?: string;
  ip?: string;
  user_agent?: string;
  ttclid?: string;
}

export interface EventPayload {
  event:
    | "ViewContent"
    | "AddToWishlist"
    | "Search"
    | "AddPaymentInfo"
    | "AddToCart"
    | "InitiateCheckout"
    | "ClickButton"
    | "PlaceAnOrder"
    | "CompleteRegistration"
    | "Purchase";
  event_id: string;
  event_time?: number;
  url: string;
  user: UserData;
  properties?: {
    value?: number;
    currency?: string;
    contents?: {
      content_id: string;
      content_type: "product" | "product_group";
      content_name: string;
    }[];
    search_string?: string;
  };
}

export async function sendTikTokEvent(payload: EventPayload) {
  const pixelCode = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
  const accessToken = process.env.TIKTOK_ACCESS_TOKEN;

  if (!pixelCode || !accessToken) {
    throw new Error("NEXT_PUBLIC_TIKTOK_PIXEL_ID أو TIKTOK_ACCESS_TOKEN مو موجودين في Environment Variables");
  }

  const body = {
    event_source: "web",
    event_source_id: pixelCode,
    data: [
      {
        event: payload.event,
        event_time: payload.event_time ?? Math.floor(Date.now() / 1000),
        event_id: payload.event_id,
        user: {
          ...(payload.user.email && { email: sha256(payload.user.email) }),
          ...(payload.user.phone && { phone: sha256(normalizePhone(payload.user.phone)) }),
          ...(payload.user.external_id && { external_id: sha256(payload.user.external_id) }),
          ...(payload.user.ip && { ip: payload.user.ip }),
          ...(payload.user.user_agent && { user_agent: payload.user.user_agent }),
          ...(payload.user.ttclid && { ttclid: payload.user.ttclid }),
        },
        page: { url: payload.url },
        properties: payload.properties ?? {},
      },
    ],
  };

  const res = await fetch(TIKTOK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Access-Token": accessToken,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (data.code !== 0) {
    console.error("TikTok Events API error:", data);
  }

  return data;
}
