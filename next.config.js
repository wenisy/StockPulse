/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    basePath: '/StockPulse',  // 替换为你的GitHub仓库名
    images: {
        unoptimized: true,
    },
    // 确保不使用 app router 特有的功能
    trailingSlash: true,
};

module.exports = nextConfig;