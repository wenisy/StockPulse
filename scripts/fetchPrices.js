const fs = require('fs');
const path = require('path');
const https = require('https');

// 读取股票符号列表
const symbolsPath = path.join(__dirname, '../public/data/symbols.json');
const pricesPath = path.join(__dirname, '../public/data/prices.json');

// 获取当前日期
const today = new Date();
const dateString = today.toISOString().split('T')[0]; // 格式: YYYY-MM-DD

// 从API获取股票价格 (这里使用Yahoo Finance API)
async function fetchStockPrice(symbol) {
    return new Promise((resolve, reject) => {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d`;

        https.get(url, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    // 获取最新价格
                    const result = jsonData.chart.result[0];
                    if (result && result.meta && result.meta.regularMarketPrice) {
                        const price = result.meta.regularMarketPrice;
                        resolve(price);
                    } else {
                        reject(new Error(`无法获取 ${symbol} 的价格`));
                    }
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', (error) => {
            reject(error);
        });
    });
}

async function updatePrices() {
    try {
        // 读取股票列表
        const symbolsData = JSON.parse(fs.readFileSync(symbolsPath, 'utf8'));

        // 尝试读取现有价格数据文件，如果不存在则创建空对象
        let pricesData = {};
        try {
            pricesData = JSON.parse(fs.readFileSync(pricesPath, 'utf8'));
        } catch (error) {
            console.log('价格文件不存在，将创建新文件');
        }

        // 为每个股票获取价格
        const stocks = symbolsData.stocks;
        console.log(`开始获取 ${stocks.length} 支股票的价格...`);

        for (const stock of stocks) {
            try {
                const price = await fetchStockPrice(stock.symbol);
                console.log(`${stock.name} (${stock.symbol}): ${price}`);

                // 更新价格数据
                if (!pricesData[stock.symbol]) {
                    pricesData[stock.symbol] = {};
                }

                pricesData[stock.symbol].price = price;
                pricesData[stock.symbol].name = stock.name;
                pricesData[stock.symbol].lastUpdated = dateString;
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
