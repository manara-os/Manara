// Deployed backend (Railway) and frontend (Vercel). Setting NEXT_PUBLIC_API_URL /
// NEXT_PUBLIC_APP_URL in the environment still wins; these are only the fallbacks
// so a production build works without any dashboard configuration.
const PROD_API_URL = 'https://api-production-24b5.up.railway.app/api/v1';
const PROD_APP_URL = 'https://manara-os.vercel.app';

const isProd = process.env.NODE_ENV === 'production';

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL || (isProd ? PROD_API_URL : 'http://localhost:3001/api/v1');
const appUrl =
  process.env.NEXT_PUBLIC_APP_URL || (isProd ? PROD_APP_URL : 'http://localhost:3000');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Inlined at build time, so `process.env.NEXT_PUBLIC_API_URL` in client code
  // resolves to the value computed above rather than being undefined.
  env: {
    NEXT_PUBLIC_API_URL: apiUrl,
    NEXT_PUBLIC_APP_URL: appUrl,
  },

  poweredByHeader: false,
  compress: true,

  images: {
    domains: [
      'placeholder.manaraos.ae',
      'manara-os-documents.s3.me-central-1.amazonaws.com',
    ].filter(Boolean),
    formats: ['image/avif', 'image/webp'],
  },

  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    },
  ],

  rewrites: async () => [
    {
      source: '/api/:path*',
      destination: `${apiUrl}/:path*`,
    },
  ],

  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
    optimizePackageImports: ['lucide-react', 'recharts', 'framer-motion'],
  },

  webpack: (config) => {
    config.resolve.fallback = { fs: false, path: false };
    return config;
  },
};

module.exports = nextConfig;
