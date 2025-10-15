export const API_BASE = import.meta.env.VITE_API_URL || '';

export function apiPath(path: string) {
  // ensure no double-slash
  return `${API_BASE.replace(/\/$/, '')}${path.startsWith('/') ? '' : '/'}${path}`.replace(/([^:]\/)\//g, '$1');
}
