async function sha256Hash(value) {
  const data = new TextEncoder().encode(value.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function generateEventId() {
  return Date.now() + "_" + Math.random().toString(36).slice(2, 10);
}

async function trackEvent(eventName, data, user) {
  data = data || {};
  user = user || {};
  var eventId = generateEventId();

  if (window.ttq) {
    ttq.track(eventName, {
      contents: data.contents || [],
      value: data.value,
      currency: data.currency || "SAR"
    }, { event_id: eventId });
  }

  try {
    var params = new URLSearchParams(window.location.search);
    var ttclid = user.ttclid || params.get("ttclid") || undefined;

    await fetch("/api/tiktok-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: eventName,
        event_id: eventId,
        url: window.location.href,
        user: { email: user.email, phone: user.phone, ttclid: ttclid },
        properties: {
          contents: data.contents,
          value: data.value,
          currency: data.currency || "SAR"
        }
      })
    });
  } catch (e) {
    console.error("tiktok server event failed:", e);
  }
}

trackEvent("ViewContent", {
  contents: [{ content_id: "depro-001", content_type: "product", content_name: "Depro Device" }],
  value: 189,
  currency: "SAR"
});
