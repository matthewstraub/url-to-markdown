/**
 * URL to Markdown — Terminal Aesthetic
 * Design: Dark charcoal background, monospace typography, green/cyan accents
 * Layout: Single-column vertical workflow, terminal session feel
 */

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Download, Copy, Check, Terminal, AlertCircle } from "lucide-react";
import { toast } from "sonner";

type Status = "idle" | "fetching" | "converting" | "done" | "error";

export default function Home() {
  const [url, setUrl] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchPage = async (targetUrl: string): Promise<string> => {
    const response = await fetch("/api/fetch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: targetUrl }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Server error: ${response.status}`);
    }

    return data.html;
  };

  const convertToMarkdown = async (html: string): Promise<string> => {
    const TurndownService = (await import("turndown")).default;
    const turndown = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
      bulletListMarker: "-",
      emDelimiter: "_",
      strongDelimiter: "**",
    });

    // Remove script and style tags before conversion
    turndown.remove(["script", "style", "nav", "footer", "header"]);

    // Custom rule for code blocks
    turndown.addRule("pre", {
      filter: "pre",
      replacement: (content, node) => {
        const code = (node as HTMLElement).querySelector("code");
        const lang = code?.className?.match(/language-(\w+)/)?.[1] || "";
        const text = code?.textContent || content;
        return `\n\`\`\`${lang}\n${text}\n\`\`\`\n`;
      },
    });

    return turndown.turndown(html);
  };

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();

      const trimmedUrl = url.trim();
      if (!trimmedUrl) {
        toast.error("Please enter a URL");
        inputRef.current?.focus();
        return;
      }

      // Basic URL validation
      let finalUrl = trimmedUrl;
      if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
        finalUrl = "https://" + finalUrl;
        setUrl(finalUrl);
      }

      try {
        new URL(finalUrl);
      } catch {
        toast.error("Invalid URL format");
        return;
      }

      setStatus("fetching");
      setStatusMessage("Fetching page content...");
      setMarkdown("");

      try {
        const html = await fetchPage(finalUrl);

        setStatus("converting");
        setStatusMessage("Converting HTML to Markdown...");

        const md = await convertToMarkdown(html);

        if (!md.trim()) {
          throw new Error(
            "No content could be extracted. The page may be JavaScript-rendered."
          );
        }

        setMarkdown(md);
        setStatus("done");
        setStatusMessage(`Done — ${md.split("\n").length} lines extracted`);
      } catch (err) {
        setStatus("error");
        setStatusMessage(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
      }
    },
    [url]
  );

  const handleDownload = () => {
    if (!markdown) return;

    const blob = new Blob([markdown], { type: "text/markdown" });
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");

    // Generate filename from URL
    let filename = "page.md";
    try {
      const parsed = new URL(url);
      const pathParts = parsed.pathname.split("/").filter(Boolean);
      if (pathParts.length > 0) {
        filename = pathParts[pathParts.length - 1].replace(/\.\w+$/, "") + ".md";
      } else {
        filename = parsed.hostname.replace(/\./g, "-") + ".md";
      }
    } catch {
      // fallback to default
    }

    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
    toast.success(`Downloaded ${filename}`);
  };

  const handleCopy = async () => {
    if (!markdown) return;
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative scanlines">
      {/* Header */}
      <header className="border-b border-border/50 py-4">
        <div className="container">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-primary" />
            <h1 className="text-sm font-semibold tracking-wide text-primary">
              url-to-markdown
            </h1>
            <span className="text-xs text-muted-foreground ml-auto">
              v1.0.0
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-8">
        <div className="container">
          {/* Input Section */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-primary text-xs">$</span>
              <span className="text-xs text-muted-foreground">
                Enter a URL to convert
              </span>
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2">
              <div className="flex-1 relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-primary text-sm">
                  &gt;
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="https://example.com/article"
                  className="w-full bg-input border border-border rounded-md py-2.5 pl-8 pr-4 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all"
                  autoFocus
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>
              <Button
                type="submit"
                disabled={status === "fetching" || status === "converting"}
                className="bg-primary text-primary-foreground hover:bg-primary/80 text-sm font-medium px-5"
              >
                {status === "fetching" || status === "converting"
                  ? "..."
                  : "Fetch"}
              </Button>
            </form>
          </section>

          {/* Status Line */}
          {status !== "idle" && (
            <section className="mb-6">
              <div
                className={`flex items-center gap-2 text-xs ${
                  status === "error"
                    ? "text-destructive"
                    : status === "done"
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {status === "fetching" || status === "converting" ? (
                  <span className="inline-block w-3 animate-spin">⠋</span>
                ) : status === "error" ? (
                  <AlertCircle className="w-3 h-3" />
                ) : (
                  <Check className="w-3 h-3" />
                )}
                <span>{statusMessage}</span>
              </div>
            </section>
          )}

          {/* Output Section */}
          {markdown && (
            <section>
              {/* Output Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    output.md
                  </span>
                  <span className="text-xs text-muted-foreground/50">
                    ({markdown.length.toLocaleString()} chars)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="text-xs h-7 px-3 border-border/50 hover:border-primary/50 hover:text-primary"
                  >
                    {copied ? (
                      <Check className="w-3 h-3 mr-1.5" />
                    ) : (
                      <Copy className="w-3 h-3 mr-1.5" />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                    className="text-xs h-7 px-3 border-border/50 hover:border-primary/50 hover:text-primary"
                  >
                    <Download className="w-3 h-3 mr-1.5" />
                    Download .md
                  </Button>
                </div>
              </div>

              {/* Markdown Preview */}
              <div className="relative rounded-md border border-border bg-card overflow-hidden">
                {/* Line numbers + content */}
                <div className="overflow-auto max-h-[60vh]">
                  <pre className="p-4 text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap break-words">
                    {markdown}
                  </pre>
                </div>
              </div>
            </section>
          )}

          {/* Empty State */}
          {status === "idle" && !markdown && (
            <section className="mt-16 text-center">
              <div className="text-muted-foreground/40 text-xs space-y-2">
                <p>Paste a URL above and press Enter or click Fetch.</p>
                <p>
                  The page content will be fetched, converted to Markdown,
                </p>
                <p>and made available for download.</p>
              </div>
              <div className="mt-8 text-muted-foreground/20 text-xs">
                <p>Supports articles, blog posts, documentation pages.</p>
                <p className="mt-1">
                  Note: JavaScript-rendered pages (SPAs) may not work.
                </p>
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 py-3">
        <div className="container">
          <p className="text-xs text-muted-foreground/40 text-center">
            Markdown conversion happens in your browser. The server only fetches the page HTML.
          </p>
        </div>
      </footer>
    </div>
  );
}
