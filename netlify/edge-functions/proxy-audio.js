// netlify/edge-functions/proxy-audio.js
// بديل Netlify Edge Function لنقطة /api/proxy-audio التي كانت في server.js
// يدعم Range requests (مهم لتشغيل الصوت والتقديم/التأخير في المشغل)

function isSafeUrl(urlStr) {
  if (!urlStr || typeof urlStr !== "string") return false;
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "169.254.169.254" ||
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("172.16.") ||
      hostname.startsWith("172.17.") ||
      hostname.startsWith("172.18.") ||
      hostname.startsWith("172.19.") ||
      hostname.startsWith("172.2") ||
      hostname.startsWith("172.30.") ||
      hostname.startsWith("172.31.") ||
      hostname.endsWith(".internal") ||
      hostname.endsWith(".local")
    ) {
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

export default async (request) => {
  const url = new URL(request.url);
  const fileUrl = url.searchParams.get("url");

  if (!fileUrl) {
    return new Response("Missing audio URL", { status: 400 });
  }

  if (!isSafeUrl(fileUrl)) {
    return new Response("Invalid or restricted audio URL", { status: 403 });
  }

  const cleanUrl = fileUrl.replace(/^http:\/\//i, "https://");

  try {
    let referer = "https://islamhouse.com/";
    try {
      const parsed = new URL(cleanUrl);
      referer = `${parsed.protocol}//${parsed.hostname}/`;
    } catch (e) {}

    const fetchHeaders = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Referer: referer,
      Accept: "*/*",
    };
    const range = request.headers.get("range");
    if (range) fetchHeaders["Range"] = range;

    const upstream = await fetch(cleanUrl, { redirect: "follow", headers: fetchHeaders });

    const headers = new Headers();
    ["content-type", "content-length", "content-range", "accept-ranges"].forEach((h) => {
      const val = upstream.headers.get(h);
      if (val) headers.set(h, val);
    });
    headers.set("Access-Control-Allow-Origin", "*");

    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (error) {
    console.error("Audio proxy error:", error);
    return new Response("Error proxying audio", { status: 500 });
  }
};

export const config = { path: "/api/proxy-audio" };
