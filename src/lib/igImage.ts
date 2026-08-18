// Instagram/scraper image URL resolver.
// Hosts that serve images publicly (with CORS/hotlink allowed) are loaded
// directly — that is much faster than routing every thumbnail through an
// edge function. Only Instagram's own CDN needs the proxy.

const DIRECT_HOSTS = /(^|\.)(socialhubapi\.com|vercel\.app)$/i;
const PROXY_HOSTS = /(^|\.)(cdninstagram\.com|fbcdn\.net)$/i;

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export function proxyImageUrl(url: string): string {
  return `${FUNCTIONS_BASE}/ig-image-proxy?url=${encodeURIComponent(url)}`;
}

/** Best URL to render an Instagram media/avatar image in the browser. */
export function igImageUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  try {
    const host = new URL(url).hostname;
    if (DIRECT_HOSTS.test(host)) return url;
    if (PROXY_HOSTS.test(host)) return proxyImageUrl(url);
    return url;
  } catch {
    return undefined;
  }
}

/** On error, retry once through the proxy before giving up. */
export function igImageFallback(img: HTMLImageElement, original?: string | null) {
  if (!original || img.dataset.retried === '1') {
    img.style.opacity = '0.2';
    return;
  }
  img.dataset.retried = '1';
  img.src = proxyImageUrl(original);
}
