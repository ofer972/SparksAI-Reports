/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removed rewrites - middleware.ts now handles all /api/* proxying
  // This ensures HTTP methods (POST, PUT, PATCH, DELETE) are preserved
  // which was not working with rewrites on Railway
}

module.exports = nextConfig





