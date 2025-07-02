export const getApiUrl = (path: string) => {
  // Use query parameter approach for cleaner proxy routing
  return `/api/proxy?endpoint=${path}`;
}; 

export const getApiHeaders = (): Record<string, string> => {
  // No API key needed - the server-side proxy handles authentication
  return {};
}; 