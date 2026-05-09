/** @type {import('next').NextConfig} */

// 检查是否使用自定义域名
const useCustomDomain = process.env.USE_CUSTOM_DOMAIN === 'true';
// dev 模式下不用 basePath, 直接 / 访问；只有 build (production) 时才挂到 /StockPulse 下
const isDev = process.env.NODE_ENV !== 'production';

const basePath = isDev ? '' : (useCustomDomain ? '' : '/StockPulse');

const nextConfig = {
    output: 'export',
    basePath,
    assetPrefix: basePath,
    images: {
        unoptimized: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    trailingSlash: true,
    // dev 阶段允许从局域网 IP 访问 _next/* 资源
    allowedDevOrigins: ['9.208.244.244', 'localhost', '127.0.0.1'],
};

module.exports = nextConfig;