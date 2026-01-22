/** @type {import('next').NextConfig} */
const nextConfig = {
    // Enable React strict mode for better development experience
    reactStrictMode: true,

    // Optimize package imports
    experimental: {
        optimizePackageImports: ['@supabase/supabase-js'],
    },
}

export default nextConfig
