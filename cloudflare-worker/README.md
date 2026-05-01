# Cloudflare Worker — CORS Proxy

This Cloudflare Worker acts as a CORS proxy for the URL-to-Markdown tool. It fetches web pages on behalf of the browser frontend, bypassing CORS restrictions.

## Setup

1. Install Wrangler CLI: `npm install -g wrangler`
2. Log in to Cloudflare: `wrangler login`
3. Deploy the worker: `cd cloudflare-worker && wrangler deploy`

The worker will be deployed to `https://url-to-markdown-proxy.<your-subdomain>.workers.dev`.

## Configuration

After deploying, update the `VITE_PROXY_URL` in your Render environment (or `.env` file) to point to your worker URL.

## Free Tier Limits

Cloudflare Workers free tier includes 100,000 requests per day, which is more than enough for personal use.
