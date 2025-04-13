export function useApi() {
  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await fetch(`/api${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `Failed to ${method.toLowerCase()} ${path}`);
    }

    // For DELETE requests that return 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    // For all other requests, parse the JSON response
    const data = await response.json();
    return data;
  }

  return {
    get: <T>(path: string) => request<T>('GET', path),
    post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
    patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
    delete: (path: string) => request<void>('DELETE', path),
  };
}
