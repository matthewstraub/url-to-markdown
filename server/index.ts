import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(express.json());

  // API endpoint to fetch a URL and return its HTML content
  app.post("/api/fetch", async (req, res) => {
    const { url } = req.body;

    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "URL is required" });
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: "Invalid URL format" });
    }

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; URLtoMarkdown/1.0; +https://github.com/matthewstraub/url-to-markdown)",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        return res.status(502).json({
          error: `Failed to fetch URL: ${response.status} ${response.statusText}`,
        });
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
        return res.status(400).json({
          error: `URL does not return HTML content (got: ${contentType})`,
        });
      }

      const html = await response.text();
      res.json({ html, url: response.url });
    } catch (err: any) {
      if (err.name === "TimeoutError" || err.name === "AbortError") {
        return res.status(504).json({ error: "Request timed out (15s limit)" });
      }
      return res.status(502).json({
        error: err.message || "Failed to fetch the URL",
      });
    }
  });

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = parseInt(process.env.PORT || "3001", 10);

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
