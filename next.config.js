/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // On Railway: use INTERNAL_BACKEND_URL (server-side only, internal domain)
    // On localhost: use NEXT_PUBLIC_BACKEND_URL if set, otherwise default to localhost:8000
    const backendUrl = process.env.INTERNAL_BACKEND_URL ||
                       process.env.NEXT_PUBLIC_BACKEND_URL ||
                       'http://localhost:8000';

    // Gateway URL for authentication endpoints
    const gatewayUrl = process.env.INTERNAL_GATEWAY_URL ||
                       process.env.NEXT_PUBLIC_GATEWAY_URL ||
                       'http://localhost:8080';

    // Ensure destination is valid
    if (!/^https?:\/\//.test(backendUrl)) {
      throw new Error(
        `Invalid backend URL: "${backendUrl}". It must start with http:// or https://`
      );
    }

    if (!/^https?:\/\//.test(gatewayUrl)) {
      throw new Error(
        `Invalid gateway URL: "${gatewayUrl}". It must start with http:// or https://`
      );
    }

    // Remove trailing slash if present
    const cleanBackendUrl = backendUrl.replace(/\/$/, '');
    const cleanGatewayUrl = gatewayUrl.replace(/\/$/, '');

    return [
      // Authentication endpoints go to Gateway Service (port 8080)
      {
        source: '/api/login',
        destination: `${cleanGatewayUrl}/api/login`,
      },
      {
        source: '/api/register',
        destination: `${cleanGatewayUrl}/api/register`,
      },
      {
        source: '/api/auth/:path*',
        destination: `${cleanGatewayUrl}/api/auth/:path*`,
      },
      {
        source: '/api/oauth/:path*',
        destination: `${cleanGatewayUrl}/api/oauth/:path*`,
      },
      // All other API endpoints go to Backend Service (port 8000)
      {
        // Rewrite /api/:path* to backend/api/:path*
        // Backend expects /api/v1/... format
        // When request is /api/v1/issues/..., :path* captures "v1/issues/..."
        // Using string concatenation to ensure :path* is preserved correctly
        source: '/api/:path*',
        destination: `${cleanBackendUrl}/api/:path*`,
      },
    ];
  },
}

module.exports = nextConfig








