/**
 * Utility to proxy Clash of Clans API images through our backend
 * to avoid CORS issues
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Get a proxied image URL for Clash of Clans API assets
 * @param imageUrl - The original image URL from CoC API
 * @returns The proxied URL through our backend
 */
export function getProxiedImageUrl(imageUrl: string | undefined): string | undefined {
  if (!imageUrl) return undefined;

  // If it's already a CoC API asset URL, proxy it
  if (imageUrl.startsWith('https://api-assets.clashofclans.com/')) {
    return `${API_URL}/api/coc/proxy-image?url=${encodeURIComponent(imageUrl)}`;
  }

  // Otherwise, return as-is
  return imageUrl;
}
