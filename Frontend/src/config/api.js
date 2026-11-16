const rawApiUrl = (import.meta.env.VITE_API_URL || 'https://backend-maghsaltak.vercel.app').trim();

// Ensure the URL always has an http/https protocol so the browser never treats it as a relative path
let formattedUrl = rawApiUrl;
if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
    formattedUrl = `https://${formattedUrl}`;
}

// Strip any trailing slashes
formattedUrl = formattedUrl.replace(/\/+$/, '');

export const API_BASE_URL = formattedUrl;
export default API_BASE_URL;
