import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

// Create an instance of axios with default config
// Use type assertion for Vite's import.meta.env
// const baseURL = (import.meta.env?.VITE_API_URL as string | undefined) || 'http://localhost:3000';

let baseUrl: string;

export const configureApiClient = (url: string) => {
  baseUrl = url;
};

export class ApiClient {
  api: AxiosInstance;

  constructor(params: {
    baseURL: string | undefined;
    withCredentials: boolean | undefined;
    apiKey: string | undefined;
  }) {
    let config = {
      baseURL: params.baseURL || baseUrl,
      timeout: 10000,
      withCredentials: params.withCredentials || true,
      headers: {
        'Content-Type': 'application/json'
      } as Record<string, string>
    };

    if (params.apiKey) {
      config.headers['Authorization'] = `Bearer ${params.apiKey}`;
    }

    this.api = axios.create(config);
  }
}
