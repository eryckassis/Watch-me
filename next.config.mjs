/** @type {import('next').NextConfig} */
const apiBaseUrl = process.env.SCREEN_GOLE_API_BASE_URL?.replace(/\/$/, '')

const nextConfig = {
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return {
      beforeFiles: apiBaseUrl ? [
        {
          source: '/api/:path*',
          destination: `${apiBaseUrl}/api/:path*`,
        },
      ] : [],
      afterFiles: [],
      fallback: [],
    }
  },
}

export default nextConfig
