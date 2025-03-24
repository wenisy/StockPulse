/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    basePath: '/StockPulse',  // 替换为你的GitHub仓库名
    images: {
        unoptimized: true,
    },
    // 禁用 ESLint 检查
    eslint: {
        ignoreDuringBuilds: true,
    },
    // 禁用类型检查
    typescript: {
        ignoreBuildErrors: true,
    },
    trailingSlash: true,
};

module.exports = nextConfig;