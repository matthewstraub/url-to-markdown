# url-to-markdown

A web-based tool that converts any web page into clean Markdown. Paste a URL, click Fetch, and download the result as a `.md` file. The HTML-to-Markdown conversion runs entirely in the browser using [Turndown.js](https://github.com/mixmark-io/turndown), while a lightweight [Cloudflare Worker](https://developers.cloudflare.com/workers/) handles the page fetch to avoid CORS restrictions.

**Live site:** [url-to-markdown-wr2f.onrender.com](https://url-to-markdown-wr2f.onrender.com)

---

## How It Works

The application follows a two-stage pipeline. When a user submits a URL, the browser sends a `POST` request to a Cloudflare Worker, which fetches the target page's HTML and returns it as JSON. The browser then passes that HTML through Turndown.js to produce Markdown output. This architecture keeps the conversion logic client-side while offloading the network fetch to a serverless function that is not subject to browser CORS policies.

```
┌──────────────┐       POST {url}       ┌────────────────────┐      GET url       ┌──────────────┐
│              │ ────────────────────▶   │                    │ ──────────────────▶ │              │
│   Browser    │                         │ Cloudflare Worker  │                     │  Target Site │
│  (Turndown)  │   ◀──────────────────── │   (CORS Proxy)     │ ◀────────────────── │              │
│              │       {html: "..."}     │                    │      HTML response  │              │
└──────────────┘                         └────────────────────┘                     └──────────────┘
```

The Turndown conversion is configured with sensible defaults for common content pages:

| Setting | Value | Purpose |
|---|---|---|
| Heading style | ATX (`# H1`, `## H2`) | Widely compatible Markdown headings |
| Code blocks | Fenced (triple backticks) | Preserves language hints from `<code>` classes |
| Bullet marker | `-` | Clean, readable lists |
| Stripped tags | `<script>`, `<style>`, `<nav>`, `<footer>`, `<header>` | Removes boilerplate, keeps article content |

---

## Features

- **Paste and convert** — enter any URL and get Markdown output in seconds.
- **Download as `.md`** — the filename is derived from the URL path or hostname automatically.
- **Copy to clipboard** — one-click copy of the full Markdown output.
- **Smart URL handling** — automatically prepends `https://` if the protocol is missing.
- **Terminal-inspired UI** — dark theme with JetBrains Mono typography and green accent colors.

---

## Architecture

The project is split into two independently deployable pieces:

| Component | Technology | Hosting | Free Tier |
|---|---|---|---|
| Frontend | React 19, Tailwind CSS 4, Vite, Turndown.js | Render (static site) | Unlimited |
| CORS Proxy | Cloudflare Worker (ES modules) | Cloudflare | 100,000 requests/day |

### Project Structure

```
url-to-markdown/
├── client/                      # Frontend application
│   ├── index.html               # HTML entry point (loads JetBrains Mono)
│   ├── public/                  # Static assets (favicon, robots.txt)
│   └── src/
│       ├── App.tsx              # Router and providers
│       ├── index.css            # Tailwind config and theme variables
│       ├── main.tsx             # React entry point
│       └── pages/
│           └── Home.tsx         # Main page — URL input, fetch, convert, download
├── cloudflare-worker/           # Serverless CORS proxy
│   ├── worker.js                # Worker script (ES module)
│   ├── wrangler.toml            # Wrangler deployment config
│   └── README.md                # Worker-specific setup instructions
├── server/                      # Minimal Express server (serves static files in production)
│   └── index.ts
├── render.yaml                  # Render Blueprint for static site deployment
├── package.json
├── tsconfig.json
└── vite.config.ts               # Vite build config with path aliases
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- [pnpm](https://pnpm.io/) (the project uses pnpm as its package manager)
- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free) for the CORS proxy

### Local Development

Clone the repository and install dependencies:

```bash
git clone https://github.com/matthewstraub/url-to-markdown.git
cd url-to-markdown
pnpm install
```

Start the Vite development server:

```bash
pnpm dev
```

The app will be available at `http://localhost:3000`. In development, the frontend calls the production Cloudflare Worker by default. To use a local or custom proxy, create a `.env` file in the project root:

```env
VITE_PROXY_URL=https://your-worker.your-subdomain.workers.dev
```

### Type Checking

Run the TypeScript compiler in check mode to verify types without emitting files:

```bash
pnpm check
```

### Building for Production

Generate the production build:

```bash
pnpm build
```

The compiled static assets are written to `dist/public/`, which is the directory Render serves.

---

## Deployment

### 1. Deploy the Cloudflare Worker

The Cloudflare Worker acts as a CORS proxy. It accepts `POST` requests containing a URL and returns the fetched HTML.

**Option A — Using the Wrangler CLI:**

```bash
npm install -g wrangler
wrangler login
cd cloudflare-worker
wrangler deploy
```

**Option B — Using the Cloudflare API:**

If you have a Cloudflare API token with Workers Scripts edit permission:

```bash
curl -X PUT \
  "https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/workers/scripts/url-to-markdown-proxy" \
  -H "Authorization: Bearer <API_TOKEN>" \
  -F "worker.js=@cloudflare-worker/worker.js;type=application/javascript+module" \
  -F 'metadata={"main_module":"worker.js","compatibility_date":"2024-01-01"};type=application/json'
```

After deployment, the worker will be available at `https://url-to-markdown-proxy.<your-subdomain>.workers.dev`.

### 2. Deploy the Frontend on Render

The repository includes a `render.yaml` Blueprint file that configures the static site automatically.

**Using the Render Dashboard:**

1. Go to [dashboard.render.com](https://dashboard.render.com) and click **New** then **Static Site**.
2. Connect the `matthewstraub/url-to-markdown` GitHub repository.
3. Render will auto-detect the settings, but verify them:

| Setting | Value |
|---|---|
| Name | `url-to-markdown` |
| Branch | `main` |
| Build Command | `pnpm install && pnpm run build` |
| Publish Directory | `dist/public` |

4. Click **Deploy Static Site**.

The site will be live at `https://url-to-markdown-<id>.onrender.com`. Render automatically redeploys when you push to the `main` branch.

### 3. Connect the Proxy URL (Optional)

By default, the frontend is configured to call `https://url-to-markdown-proxy.matt-straub.workers.dev`. If you deploy your own worker, update the proxy URL by adding an environment variable in Render's dashboard under **Environment**:

| Variable | Value |
|---|---|
| `VITE_PROXY_URL` | `https://your-worker.your-subdomain.workers.dev` |

After adding the variable, trigger a manual redeploy for the change to take effect.

---

## Cloudflare Worker Configuration

### Origin Allowlist

The worker includes an `ALLOWED_ORIGINS` array in `worker.js` that controls which domains can call the proxy. By default it is set to `"*"` (all origins). For production use, restrict it to your Render domain:

```javascript
const ALLOWED_ORIGINS = [
  "https://url-to-markdown-wr2f.onrender.com",
  "http://localhost:3000", // for local development
];
```

### Rate Limits

The Cloudflare Workers free tier provides 100,000 requests per day. For additional protection, you can add rate limiting through Cloudflare's dashboard or by implementing a simple in-memory counter in the worker script.

---

## Limitations

- **JavaScript-rendered pages (SPAs)** — pages that rely on client-side JavaScript to render content will return minimal or empty Markdown, since the worker fetches raw HTML without executing JavaScript.
- **Authentication-gated content** — pages behind login walls will not be accessible through the proxy.
- **Very large pages** — the Cloudflare Workers free tier has a 128 MB memory limit and a 10 ms CPU time limit per request, which is sufficient for most web pages but may fail on extremely large documents.
- **Media content** — images are converted to Markdown image syntax (`![alt](src)`) with their original URLs, but are not downloaded or embedded in the `.md` file.

---

## Tech Stack

| Layer | Technology | Role |
|---|---|---|
| UI Framework | React 19 | Component rendering |
| Styling | Tailwind CSS 4 | Utility-first styling |
| UI Components | shadcn/ui (Radix primitives) | Accessible component library |
| Build Tool | Vite 7 | Development server and bundler |
| HTML-to-Markdown | Turndown.js | Client-side Markdown conversion |
| CORS Proxy | Cloudflare Workers | Serverless page fetching |
| Hosting | Render (static site) | Free static site hosting |
| Font | JetBrains Mono | Monospace terminal aesthetic |

---

## License

MIT
