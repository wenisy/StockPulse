/** @type {import('next').NextConfig} */

// 检查是否使用自定义域名
const useCustomDomain = process.env.USE_CUSTOM_DOMAIN === 'true';

const nextConfig = {
    output: 'export',
    // 根据环境变量决定是否使用basePath
    basePath: useCustomDomain ? '' : '/StockPulse',
    images: {
        unoptimized: true,
    },
    // 禁用类型检查
    typescript: {
        ignoreBuildErrors: true,
    },
    trailingSlash: true,
    // 添加自定义域名的assetPrefix配置
    assetPrefix: useCustomDomain ? '' : '/StockPulse',
};

module.exports = nextConfig;