/**
 * Cloudflare Worker — CORS Proxy for url-to-markdown
 *
 * Accepts POST requests with { url: "..." } and returns the fetched HTML.
 * Adds CORS headers so the static frontend can call it cross-origin.
 *
 * Deploy: npx wrangler deploy
 * Free tier: 100,000 requests/day
 */

// Set your allowed origins here. Use "*" during development,
// then lock it down to your Render domain in production.
const ALLOWED_ORIGINS = [
  "*", // Allow all origins (change to your domain in production)
];

function corsHeaders(origin) {
  const allowedOrigin =
    ALLOWED_ORIGINS.includes("*") ? "*" :
    ALLOWED_ORIGINS.includes(origin) ? origin : null;

  if (!allowedOrigin) return null;

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get("Origin") || "";
    const headers = corsHeaders(origin);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: headers || {} });
    }

    // Only accept POST
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    if (!headers) {
      return new Response(JSON.stringify({ error: "Origin not allowed" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const body = await request.json();
      const targetUrl = body.url;

      if (!targetUrl || typeof targetUrl !== "string") {
        return new Response(JSON.stringify({ error: "URL is required" }), {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }

      // Validate URL
      try {
        new URL(targetUrl);
      } catch {
        return new Response(JSON.stringify({ error: "Invalid URL format" }), {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }

      // Fetch the target URL
      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; URLtoMarkdown/1.0; +https://github.com/matthewstraub/url-to-markdown)",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
        redirect: "follow",
      });

      if (!response.ok) {
        return new Response(
          JSON.stringify({
            error: `Failed to fetch URL: ${response.status} ${response.statusText}`,
          }),
          {
            status: 502,
            headers: { ...headers, "Content-Type": "application/json" },
          }
        );
      }

      const html = await response.text();

      return new Response(JSON.stringify({ html, url: response.url }), {
        status: 200,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: err.message || "Internal proxy error" }),
        {
          status: 500,
          headers: { ...headers, "Content-Type": "application/json" },
        }
      );
    }
  },
};
