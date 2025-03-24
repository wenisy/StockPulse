const fs = require('fs');
const path = require('path');
const https = require('https');

// 文件路径
const symbolsPath = path.join(__dirname, '../public/data/symbols.json');
const pricesPath = path.join(__dirname, '../public/data/prices.json');

// 获取当前日期
const today = new Date();
const dateString = today.toISOString().split('T')[0];

// 从Yahoo Finance API获取股票价格
async function fetchStockPrice(symbol) {
    return new Promise((resolve, reject) => {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d`;
        console.log(`[${new Date().toISOString()}] 请求Yahoo Finance: ${url}`);

        const req = https.get(url, (res) => {
            let data = '';
            console.log(`[${new Date().toISOString()}] ${symbol} HTTP状态码: ${res.statusCode}`);

            if (res.statusCode !== 200) {
                return reject(new Error(`HTTP状态码错误: ${res.statusCode}`));
            }

            res.on('data', (chunk) => data += chunk);

            res.on('end', () => {
                try {
                    if (!data.trim().startsWith('{')) {
                        return reject(new Error(`返回的数据不是JSON`));
                    }
                    const jsonData = JSON.parse(data);
                    if (jsonData.chart?.error) {
                        return reject(new Error(`Yahoo API错误: ${JSON.stringify(jsonData.chart.error)}`));
                    }
                    const price = jsonData.chart?.result?.[0]?.meta?.regularMarketPrice;
                    if (price) {
                        resolve(price);
                    } else {
                        reject(new Error(`无法找到价格数据`));
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
}

// 等待函数
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
                console.error(`[${new Date().toISOString()}] 获取 ${stock.symbol} 失败: ${error.message}`);
            }
            // 无论成功还是失败，都等待10秒
            console.log(`[${new Date().toISOString()}] 等待10秒...`);
            await wait(10000); // 10秒
        }

        fs.writeFileSync(pricesPath, JSON.stringify(pricesData, null, 2));
        console.log(`[${new Date().toISOString()}] 价格数据已保存到 ${pricesPath}`);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] 更新价格出错:`, error);
        process.exit(1);
    }
}

// 运行主函数
updatePrices();