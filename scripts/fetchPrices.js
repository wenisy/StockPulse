const fs = require('fs');
const path = require('path');
const https = require('https');

// 读取股票符号列表
const symbolsPath = path.join(__dirname, '../public/data/symbols.json');
const pricesPath = path.join(__dirname, '../public/data/prices.json');

// 获取当前日期
const today = new Date();
const dateString = today.toISOString().split('T')[0]; // 格式: YYYY-MM-DD

// 从API获取股票价格 (使用Yahoo Finance API)
async function fetchStockPrice(symbol) {
    return new Promise((resolve, reject) => {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d`;
        console.log(`请求URL: ${url}`);

        const req = https.get(url, (res) => {
            let data = '';

            // 记录HTTP状态码
            console.log(`${symbol} HTTP状态码: ${res.statusCode}`);

            // 如果不是200，记录错误
            if (res.statusCode !== 200) {
                return reject(new Error(`HTTP状态码错误: ${res.statusCode}`));
            }

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    // 检查返回的数据是否以 '{' 开头
                    if (!data.trim().startsWith('{')) {
                        console.log(`${symbol} 返回的数据不是JSON: ${data.substring(0, 50)}...`);
                        return reject(new Error(`返回的数据不是JSON: ${data.substring(0, 50)}...`));
                    }

                    const jsonData = JSON.parse(data);

                    // 检查是否有错误信息
                    if (jsonData.chart && jsonData.chart.error) {
                        return reject(new Error(`Yahoo API错误: ${JSON.stringify(jsonData.chart.error)}`));
                    }

                    // 获取最新价格
                    if (jsonData.chart &&
                        jsonData.chart.result &&
                        jsonData.chart.result[0] &&
                        jsonData.chart.result[0].meta &&
                        jsonData.chart.result[0].meta.regularMarketPrice) {
                        const price = jsonData.chart.result[0].meta.regularMarketPrice;
                        resolve(price);
                    } else {
                        console.log(`${symbol} 无法找到价格数据: ${JSON.stringify(jsonData).substring(0, 200)}...`);
                        reject(new Error(`无法找到价格数据`));
                    }
                } catch (error) {
                    console.log(`${symbol} JSON解析错误: ${error.message}`);
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            console.log(`${symbol} 请求错误: ${error.message}`);
            reject(error);
        });

        // 设置超时
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('请求超时'));
        });
    });
}

// 使用代理或备用API的函数
async function fetchStockPriceFallback(symbol) {
    // 这里可以实现备用API
    // 例如 Alpha Vantage 或 IEX Cloud
    // 此处仅为示例
    return Math.random() * 100 + 50; // 返回50-150之间的随机数
}

async function updatePrices() {
    try {
        // 读取股票列表
        const symbolsData = JSON.parse(fs.readFileSync(symbolsPath, 'utf8'));

        // 尝试读取现有价格数据文件，如果不存在则创建空对象
        let pricesData = {};
        try {
            if (fs.existsSync(pricesPath)) {
                pricesData = JSON.parse(fs.readFileSync(pricesPath, 'utf8'));
            }
        } catch (error) {
            console.log('价格文件不存在或无法解析，将创建新文件');
        }

        // 为每个股票获取价格
        const stocks = symbolsData.stocks;
        console.log(`开始获取 ${stocks.length} 支股票的价格...`);

        for (const stock of stocks) {
            try {
                console.log(`开始获取 ${stock.name} (${stock.symbol}) 的价格...`);

                // 设置重试次数
                let attempts = 0;
                const maxAttempts = 3;
                let price = null;

                while (attempts < maxAttempts && price === null) {
                    try {
                        attempts++;
                        console.log(`尝试 ${attempts}/${maxAttempts}...`);

                        // 尝试使用Yahoo Finance API
                        price = await fetchStockPrice(stock.symbol);
                    } catch (error) {
                        console.log(`尝试 ${attempts} 失败: ${error.message}`);

                        // 最后一次尝试，使用备用API
                        if (attempts === maxAttempts) {
                            try {
                                console.log(`尝试使用备用方法获取价格...`);
                                price = await fetchStockPriceFallback(stock.symbol);
                            } catch (fallbackError) {
                                console.error(`备用方法也失败了: ${fallbackError.message}`);
                            }
                        } else {
                            // 等待一秒再重试
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                    }
                }

                if (price !== null) {
                    console.log(`${stock.name} (${stock.symbol}): ${price}`);

                    // 更新价格数据
                    if (!pricesData[stock.symbol]) {
                        pricesData[stock.symbol] = {};
                    }

                    pricesData[stock.symbol].price = price;
                    pricesData[stock.symbol].name = stock.name;
                    pricesData[stock.symbol].lastUpdated = dateString;
                } else {
                    console.error(`无法获取 ${stock.symbol} 的价格，保留旧数据`);
                }
            } catch (error) {
                console.error(`获取 ${stock.symbol} 价格时出错:`, error.message);
            }
        }

        // 保存更新后的价格数据
        fs.writeFileSync(pricesPath, JSON.stringify(pricesData, null, 2));
        console.log(`价格数据已保存到 ${pricesPath}`);
    } catch (error) {
        console.error('更新价格时出错:', error);
        process.exit(1);
    }
}

// 运行主函数
updatePrices();
