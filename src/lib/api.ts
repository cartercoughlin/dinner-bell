/**
 * Resolve the backend API base URL.
 * - Production (Express serves SPA): same origin, empty string.
 * - Vite dev: proxy /api to localhost:3001, or use VITE_API_URL.
 * - Capacitor / split deploy: set VITE_API_URL to your backend.
 */
export function getApiUrl(): string {
  const configured = import.meta.env.VITE_API_URL as string | undefined;
  if (configured?.trim()) {
    return configured.replace(/\/$/, '');
  }

  // On Capacitor (non-http origins), fall back to the public app URL
  if (typeof window !== 'undefined' && !window.location.protocol.startsWith('http')) {
    const publicUrl = import.meta.env.VITE_PUBLIC_APP_URL as string | undefined;
    if (publicUrl?.trim()) {
      return publicUrl.replace(/\/$/, '');
    }
  }

  // Dev: Vite proxies /api → Express on :3001 (see vite.config.ts)
  return '';
}

export async function readApiError(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data.message === 'string' && data.message) return data.message;
    if (typeof data.error === 'string' && data.error) return data.error;
  } catch {
    /* ignore */
  }
  return fallback;
}
