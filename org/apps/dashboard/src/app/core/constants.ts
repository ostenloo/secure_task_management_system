const FALLBACK_API = 'http://localhost:3000/api';
const GLOBAL_KEY = '__stmsApiBase__';

export const API_BASE_URL =
  (typeof window !== 'undefined' &&
    (window as unknown as Record<string, string>)[GLOBAL_KEY]) ||
  FALLBACK_API;

export const SESSION_STORAGE_KEY = 'stms.session';
