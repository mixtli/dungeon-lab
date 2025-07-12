export function getApiBaseUrl(): string {
  const { hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3000';
  }
  // For LAN IPs like 172.20.10.*, 192.168.1.*, etc.
  return `http://${hostname}:3000`;
} 