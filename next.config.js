/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // On Railway: use INTERNAL_BACKEND_URL (server-side only, internal domain)
    // On localhost: use NEXT_PUBLIC_BACKEND_URL if set, otherwise default to localhost:8000
    const backendUrl = process.env.INTERNAL_BACKEND_URL || 
                       process.env.NEXT_PUBLIC_BACKEND_URL || 
                       'http://localhost:8000';
    
    // Ensure destination is valid
    if (!/^https?:\/\//.test(backendUrl)) {
      throw new Error(
        `Invalid backend URL: "${backendUrl}". It must start with http:// or https://`
      );
    }
    
    // Remove trailing slash if present
    const cleanBackendUrl = backendUrl.replace(/\/$/, '');

    return [
      {
        // Rewrite /api/v1/... to backend/api/v1/...
        source: '/api/:path*',
        destination: `${cleanBackendUrl}/api/:path*`,
      },
    ];
  },
}

module.exports = nextConfig


