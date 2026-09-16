// netlify/edge-functions/download-file.js
// بديل Netlify Edge Function لنقطة /api/download-file التي كانت في server.js
// يعمل تلقائيًا على Netlify بدون الحاجة لتشغيل خادم Node منفصل

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

function sanitizeFilename(name) {
  if (!name || typeof name !== "string") return "download";
  return name.replace(/[\/\\?%*:|"<>]/g, "_").trim().slice(0, 100);
}

export default async (request) => {
  const url = new URL(request.url);
  const fileUrl = url.searchParams.get("url");
  const rawFilename = url.searchParams.get("filename") || "download";

  if (!fileUrl) {
    return new Response("Missing file URL", { status: 400 });
  }

  if (!isSafeUrl(fileUrl)) {
    return new Response("Invalid or restricted file URL", { status: 403 });
  }

  const filename = sanitizeFilename(rawFilename);
  const cleanUrl = fileUrl.replace(/^http:\/\//i, "https://");

  try {
    let referer = "https://islamhouse.com/";
    try {
      const parsed = new URL(cleanUrl);
      referer = `${parsed.protocol}//${parsed.hostname}/`;
    } catch (e) {}

    const upstream = await fetch(cleanUrl, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: referer,
        Accept: "*/*",
      },
    });

    if (!upstream.ok || !upstream.body) {
      return new Response(`Failed to fetch file: ${upstream.statusText}`, {
        status: upstream.status || 502,
      });
    }

    const headers = new Headers();
    headers.set(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`
    );
    headers.set(
      "Content-Type",
      upstream.headers.get("content-type") || "application/octet-stream"
    );
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Expose-Headers", "Content-Disposition, Content-Length");
    const contentLength = upstream.headers.get("content-length");
    if (contentLength) headers.set("Content-Length", contentLength);

    // بث الملف مباشرة (streaming) دون تحميله بالكامل في الذاكرة أولًا
    return new Response(upstream.body, { status: 200, headers });
  } catch (error) {
    console.error("Download proxy error:", error);
    return new Response("Error downloading file", { status: 500 });
  }
};

export const config = { path: "/api/download-file" };
