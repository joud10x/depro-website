import { NextRequest, NextResponse } from "next/server";
import { sendTikTokEvent, EventPayload } from "@/lib/tiktok";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Omit<EventPayload, "user"> & {
      user: Omit<EventPayload["user"], "ip" | "user_agent">;
    };

    // نجيب الـ IP و User-Agent من الطلب نفسه (السيرفر) — أدق من ما يرسلها المتصفح
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0] ??
      req.headers.get("x-real-ip") ??
      "";
    const userAgent = req.headers.get("user-agent") ?? "";

    const result = await sendTikTokEvent({
      ...body,
      user: {
        ...body.user,
        ip,
        user_agent: userAgent,
      },
    });

    return NextResponse.json({ ok: true, result });
  } catch (err: any) {
    console.error("tiktok-event route error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
