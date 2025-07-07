/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: {
      memoryLimit: 8192
    },
    optimizePackageImports: ['lodash', 'date-fns'],
    serverMinification: true
  },
  
  // Transpile packages from monorepo
  transpilePackages: [
    '@pharmacy/database',
    '@pharmacy/shared',
    '@pharmacy/ui'
  ],

  // API optimization
  api: {
    responseLimit: '8mb',
    bodyParser: {
      sizeLimit: '1mb'
    }
  },

  // Headers optimization pour cache 24h
  async headers() {
    return [
      {
        source: '/api/v1/kpis/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=3600'
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' }
        ]
      },
      {
        source: '/api/v1/pharmacy/:path*',
        headers: [
          {
            key: 'Cache-Control', 
            value: 'public, max-age=3600, s-maxage=3600'
          }
        ]
      }
    ]
  },

  // Webpack optimization
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false
      }
    }
    return config
  }
}

module.exports = nextConfig