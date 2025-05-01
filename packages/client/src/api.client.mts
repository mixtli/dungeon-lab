import axios, { AxiosInstance } from 'axios';

// Create an instance of axios with default config
// Use type assertion for Vite's import.meta.env
// const baseURL = (import.meta.env?.VITE_API_URL as string | undefined) || 'http://localhost:3000';

let baseUrl: string;
let apiKey: string | undefined;

export const configureApiClient = (url: string, key?: string) => {
  console.log('configureApiClient', url, apiKey);
  baseUrl = url;
  apiKey = key;
};

export class ApiClient {
  api: AxiosInstance;

  constructor(
    params: {
      baseURL?: string;
      withCredentials?: boolean;
      apiKey?: string;
    } = {}
  ) {
    const config = {
      baseURL: params.baseURL || baseUrl,
      timeout: 10000,
      withCredentials: params.withCredentials || true,
      headers: {
        'Content-Type': 'application/json'
      } as Record<string, string>
    };
    console.log('baseUrl', baseUrl);
    console.log('apiKey', apiKey);
    if (apiKey) {
      config.headers['Authorization'] = `Bearer ${apiKey}`;
    }

    if (params.apiKey) {
      config.headers['Authorization'] = `Bearer ${params.apiKey}`;
    }
    config.timeout = 100000;

    this.api = axios.create(config);
  }
}
