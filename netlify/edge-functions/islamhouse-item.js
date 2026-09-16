// netlify/edge-functions/islamhouse-item.js
// بديل Netlify Edge Function لنقطة /api/islamhouse-item التي كانت في server.js

export default async (request) => {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return new Response(JSON.stringify({ error: "Missing item id" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  // نتأكد أن المعرف أرقام فقط لمنع أي محاولة حقن داخل الرابط
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    return new Response(JSON.stringify({ error: "Invalid item id" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  try {
    const upstream = await fetch(
      `https://api3.islamhouse.com/v3/paV29H2gm56kvLPy/main/get-item/${id}/ar/json`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Referer: "https://islamhouse.com/",
        },
      }
    );

    if (!upstream.ok) {
      return new Response(JSON.stringify({ error: "Failed to fetch item" }), {
        status: upstream.status,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const data = await upstream.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Islamhouse item fetch error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
};

export const config = { path: "/api/islamhouse-item" };
