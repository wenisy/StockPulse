const fs = require('fs');
const path = require('path');
const https = require('https');

// 文件路径
const symbolsPath = path.join(__dirname, '../public/data/symbols.json');
const pricesPath = path.join(__dirname, '../public/data/prices.json');

// 获取当前日期
const today = new Date();
const dateString = today.toISOString().split('T')[0];

// 等待函数
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 获取Yahoo Finance股票价格，带重试机制
async function fetchStockPrice(symbol) {
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await new Promise((resolve, reject) => {
                const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d`;
                console.log(`[${new Date().toISOString()}] 请求 ${symbol}: ${url}`);
                const req = https.get(url, (res) => {
                    let data = '';
                    console.log(`[${new Date().toISOString()}] ${symbol} HTTP状态码: ${res.statusCode}`);
                    if (res.statusCode !== 200) {
                        return reject(new Error(`HTTP状态码错误: ${res.statusCode}`));
                    }
                    res.on('data', (chunk) => data += chunk);
                    res.on('end', () => {
                        try {
                            const jsonData = JSON.parse(data);
                            const price = jsonData.chart?.result?.[0]?.meta?.regularMarketPrice;
                            if (price) {
                                resolve(price);
                            } else {
                                reject(new Error('无法找到价格数据'));
                            }
                        } catch (error) {
                            reject(error);
                        }
                    });
                });
                req.on('error', (error) => reject(error));
                req.setTimeout(10000, () => {
                    req.destroy();
                    reject(new Error('请求超时'));
                });
            });
        } catch (error) {
            if (attempt < maxRetries) {
                console.log(`[${new Date().toISOString()}] ${symbol} 请求失败 (第 ${attempt} 次)，等待20秒后重试...`);
                await wait(20000); // 等待20秒后重试
            } else {
                throw new Error(`[${new Date().toISOString()}] ${symbol} 重试 ${maxRetries} 次后仍然失败: ${error.message}`);
            }
        }
    }
}

// 更新价格的主函数
async function updatePrices() {
    try {
        const symbolsData = JSON.parse(fs.readFileSync(symbolsPath, 'utf8'));
        let pricesData = fs.existsSync(pricesPath) ? JSON.parse(fs.readFileSync(pricesPath, 'utf8')) : {};

        const stocks = symbolsData.stocks;
        console.log(`[${new Date().toISOString()}] 开始获取 ${stocks.length} 支股票的价格...`);

        // 串行处理每个股票
        for (const stock of stocks) {
            try {
                console.log(`[${new Date().toISOString()}] 获取 ${stock.name} (${stock.symbol}) 的价格...`);
                const price = await fetchStockPrice(stock.symbol);
                console.log(`[${new Date().toISOString()}] ${stock.name} (${stock.symbol}): ${price}`);

                pricesData[stock.symbol] = {
                    price,
                    name: stock.name,
                    lastUpdated: dateString
                };
            } catch (error) {
                console.error(error.message); // 记录失败并继续
            }
            console.log(`[${new Date().toISOString()}] 等待10秒...`);
            await wait(10000); // 每个请求间隔10秒
        }

        fs.writeFileSync(pricesPath, JSON.stringify(pricesData, null, 2));
        console.log(`[${new Date().toISOString()}] 价格数据已保存到 ${pricesPath}`);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] 更新价格出错:`, error);
    }
}

// 运行主函数
updatePrices();
