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
        // Rewrite /api/:path* to backend/api/:path*
        // When request is /api/v1/issues/..., :path* captures "v1/issues/..."
        // Destination: ${backendUrl}/api/v1/issues/...
        // Note: This ensures /api is preserved in the destination URL
        source: '/api/:path*',
        destination: `${cleanBackendUrl}/api/:path*`,
      },
    ];
  },
}

module.exports = nextConfig



