import crypto from "crypto";

const TIKTOK_API_URL = "https://business-api.tiktok.com/open_api/v1.3/event/track/";

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "966" + digits.slice(1);
  if (!digits.startsWith("966")) digits = "966" + digits;
  return "+" + digits;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const pixelCode = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
    const accessToken = process.env.TIKTOK_ACCESS_TOKEN;

    if (!pixelCode || !accessToken) {
      res.status(500).json({ error: "Missing TikTok environment variables" });
      return;
    }

    const { event, event_id, url, user = {}, properties = {} } = req.body;

    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0] ??
      req.headers["x-real-ip"] ??
      "";
    const userAgent = req.headers["user-agent"] ?? "";

    const body = {
      event_source: "web",
      event_source_id: pixelCode,
      data: [
        {
          event,
          event_time: Math.floor(Date.now() / 1000),
          event_id,
          user: {
            ...(user.email && { email: sha256(user.email) }),
            ...(user.phone && { phone: sha256(normalizePhone(user.phone)) }),
            ...(user.ttclid && { ttclid: user.ttclid }),
            ip,
            user_agent: userAgent,
          },
          page: { url },
          properties,
        },
      ],
    };

    const ttRes = await fetch(TIKTOK_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Access-Token": accessToken },
      body: JSON.stringify(body),
    });

    const data = await ttRes.json();
    res.status(200).json({ ok: true, result: data });
  } catch (err: any) {
    console.error("tiktok-event error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
}
