export function getApiBaseUrl(): string {
  // Use configured API URL if set, otherwise use current origin.
  // In dev, the Vite dev server proxies /api and /socket.io to the Express backend,
  // so the frontend doesn't need to know the Express port.
  // In production, Caddy reverse proxies everything through port 80/443.
  return import.meta.env.VITE_API_URL || window.location.origin;
} 