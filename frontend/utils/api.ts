export const getApiUrl = (path: string) => {
  // In a server-side rendering context or development, use relative paths.
  // The Next.js dev server will proxy requests to the backend.
  if (typeof window === 'undefined' || process.env.NODE_ENV === 'development') {
    return path;
  }

  // In a client-side context in production, use the full backend URL.
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!backendUrl) {
    console.error('NEXT_PUBLIC_BACKEND_URL is not set for production build.');
    // Fallback to a relative path, though this may not work if the domains differ.
    return path;
  }

  return `${backendUrl}${path}`;
}; 

export const getApiHeaders = (): Record<string, string> => {
  const apiKey = process.env.NEXT_PUBLIC_API_KEY;
  return apiKey ? { 'X-API-Key': apiKey } : {};
}; 