// Type declarations for Puter.js (loaded via <script> in index.html)
interface PuterNetFetchResponse {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Headers;
  text(): Promise<string>;
  json(): Promise<any>;
  blob(): Promise<Blob>;
  arrayBuffer(): Promise<ArrayBuffer>;
}

interface PuterNet {
  fetch(url: string, options?: RequestInit): Promise<PuterNetFetchResponse>;
}

interface Puter {
  net: PuterNet;
  print(content: string, options?: { code?: boolean }): void;
}

declare const puter: Puter;
