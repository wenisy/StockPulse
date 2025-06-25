#!/usr/bin/env node

/**
 * 本地测试持仓计算逻辑
 * 模拟真实的数据结构和计算流程
 */

// 模拟Yahoo Finance API
async function mockGetRealTimeStockPrices(symbols) {
    const mockPrices = {
        'VOO': {
            price: 559.44,
            previousClose: 553.36,
            changePercent: 1.10,
            change: 6.08,
            currency: 'USD',
            name: 'Vanguard S&P 500 ETF'
        },
        'TSLA': {
            price: 340.47,
            previousClose: 348.68,
            changePercent: -2.35,
            change: -8.21,
            currency: 'USD',
            name: 'Tesla Inc'
        },
        'RKLB': {
            price: 12.85,
            previousClose: 9.92,
            changePercent: 29.54,
            change: 2.93,
            currency: 'USD',
            name: 'Rocket Lab USA Inc'
        },
        'PLTR': {
            price: 28.45,
            previousClose: 22.25,
            changePercent: 27.87,
            change: 6.20,
            currency: 'USD',
            name: 'Palantir Technologies Inc'
        },
        'GOOGL': {
            price: 175.32,
            previousClose: 211.48,
            changePercent: -17.10,
            change: -36.16,
            currency: 'USD',
            name: 'Alphabet Inc'
        },
        '0700.HK': {
            price: 420.80,
            previousClose: 274.00,
            changePercent: 53.58,
            change: 146.80,
            currency: 'HKD',
            name: 'Tencent Holdings Ltd'
        }
    };
    
    const results = {};
    symbols.forEach(symbol => {
        if (mockPrices[symbol]) {
            results[symbol] = mockPrices[symbol];
        }
    });
    
    return results;
}

// 模拟Notion数据结构 - 股票数据
const mockStocksData = [
    {
        properties: {
            Year: { select: { name: "2025" } },
            Name: { title: [{ text: { content: "Vanguard S&P 500 ETF" } }] },
            Symbol: { rich_text: [{ text: { content: "VOO" } }] },
            Shares: { number: 11 },
            'Cost Price': { number: 300.00 }
        }
    },
    {
        properties: {
            Year: { select: { name: "2025" } },
            Name: { title: [{ text: { content: "Tesla" } }] },
            Symbol: { rich_text: [{ text: { content: "TSLA" } }] },
            Shares: { number: 10 },
            'Cost Price': { number: 200.00 }
        }
    },
    {
        properties: {
            Year: { select: { name: "2025" } },
            Name: { title: [{ text: { content: "Rocket Lab" } }] },
            Symbol: { rich_text: [{ text: { content: "RKLB" } }] },
            Shares: { number: 50 },
            'Cost Price': { number: 8.00 }
        }
    },
    {
        properties: {
            Year: { select: { name: "2025" } },
            Name: { title: [{ text: { content: "Palantir" } }] },
            Symbol: { rich_text: [{ text: { content: "PLTR" } }] },
            Shares: { number: 5 },
            'Cost Price': { number: 20.00 }
        }
    },
    {
        properties: {
            Year: { select: { name: "2025" } },
            Name: { title: [{ text: { content: "Google" } }] },
            Symbol: { rich_text: [{ text: { content: "GOOGL" } }] },
            Shares: { number: 2 },
            'Cost Price': { number: 250.00 }
        }
    },
    {
        properties: {
            Year: { select: { name: "2025" } },
            Name: { title: [{ text: { content: "Tencent" } }] },
            Symbol: { rich_text: [{ text: { content: "0700.HK" } }] },
            Shares: { number: 20 },
            'Cost Price': { number: 300.00 }
        }
    }
];

// 模拟交易数据 - 2025-06-25当日有一笔卖出VST的交易
const mockTransactionsData = [
    {
        properties: {
            Date: { date: { start: "2025-06-25" } },
            Stock: { rich_text: [{ text: { content: "Vistra Energy" } }] },
            Type: { select: { name: "sell" } },
            Shares: { number: 10 },
            'Price Per Share': { number: 184.18 }
        }
    },
    {
        properties: {
            Date: { date: { start: "2025-06-24" } },
            Stock: { rich_text: [{ text: { content: "Vistra Energy" } }] },
            Type: { select: { name: "sell" } },
            Shares: { number: 10 },
            'Price Per Share': { number: 184.18 }
        }
    }
];

// 简化的持仓计算函数
function calculateSimpleHoldings(stocks, transactions, date) {
    const targetYear = date.substring(0, 4);
    const holdings = {};
    
    console.log(`\n=== 持仓计算开始 ===`);
    console.log(`目标年份: ${targetYear}, 目标日期: ${date}`);
    
    // 1. 从当年的stocks表获取基础持仓
    console.log(`\n1. 获取${targetYear}年基础持仓:`);
    stocks.forEach(stock => {
        const year = stock.properties.Year?.select?.name;
        const symbol = stock.properties.Symbol?.rich_text?.[0]?.text?.content;
        const name = stock.properties.Name?.title?.[0]?.text?.content;
        const shares = stock.properties.Shares?.number || 0;
        const costPrice = stock.properties['Cost Price']?.number || 0;
        
        if (year === targetYear && symbol && shares > 0) {
            holdings[symbol] = {
                name: name || symbol,
                symbol: symbol,
                shares: shares,
                costPrice: costPrice
            };
            console.log(`  ✓ ${name} (${symbol}): ${shares} 股, 成本价 $${costPrice}`);
        }
    });
    
    // 2. 应用当日的交易调整
    console.log(`\n2. 检查${date}当日交易:`);
    let hasTransactions = false;
    transactions.forEach(transaction => {
        const transactionDate = transaction.properties.Date?.date?.start;
        if (transactionDate !== date) return;
        
        const stockName = transaction.properties.Stock?.rich_text?.[0]?.text?.content;
        const type = transaction.properties.Type?.select?.name;
        const shares = transaction.properties.Shares?.number || 0;
        const pricePerShare = transaction.properties['Price Per Share']?.number || 0;
        
        if (stockName && shares > 0 && (type === 'buy' || type === 'sell')) {
            hasTransactions = true;
            console.log(`  📈 ${type.toUpperCase()}: ${stockName} ${shares}股 @ $${pricePerShare}`);
            
            // 通过股票名称找到对应的symbol
            let targetSymbol = null;
            Object.values(holdings).forEach(holding => {
                if (holding.name === stockName) {
                    targetSymbol = holding.symbol;
                }
            });
            
            if (targetSymbol && holdings[targetSymbol]) {
                if (type === 'buy') {
                    const oldShares = holdings[targetSymbol].shares;
                    const oldCost = oldShares * holdings[targetSymbol].costPrice;
                    const newCost = shares * pricePerShare;
                    const totalShares = oldShares + shares;
                    
                    holdings[targetSymbol].shares = totalShares;
                    if (totalShares > 0) {
                        holdings[targetSymbol].costPrice = (oldCost + newCost) / totalShares;
                    }
                    console.log(`    → 买入后: ${totalShares} 股, 新成本价 $${holdings[targetSymbol].costPrice.toFixed(2)}`);
                } else if (type === 'sell') {
                    const oldShares = holdings[targetSymbol].shares;
                    holdings[targetSymbol].shares = Math.max(0, oldShares - shares);
                    console.log(`    → 卖出后: ${holdings[targetSymbol].shares} 股`);
                    
                    if (holdings[targetSymbol].shares === 0) {
                        delete holdings[targetSymbol];
                        console.log(`    → 已清仓，移除持仓`);
                    }
                }
            } else {
                console.log(`    ⚠️  未找到对应的持仓股票: ${stockName}`);
            }
        }
    });
    
    if (!hasTransactions) {
        console.log(`  📝 当日无交易`);
    }
    
    // 3. 返回最终持仓
    const result = Object.values(holdings).filter(h => h.shares > 0);
    console.log(`\n3. 最终持仓结果:`);
    result.forEach(h => {
        console.log(`  ✓ ${h.name} (${h.symbol}): ${h.shares} 股, 成本价 $${h.costPrice.toFixed(2)}`);
    });
    
    return result;
}

// 计算当日收益的函数
async function calculateDailyReturns(holdings, date) {
    console.log(`\n=== 当日收益计算 ===`);
    
    if (holdings.length === 0) {
        console.log(`❌ 无持仓股票，跳过收益计算`);
        return {
            stocksData: [],
            totalValue: 0,
            totalDailyGain: 0,
            totalDailyGainPercent: 0
        };
    }
    
    // 获取实时价格
    const symbols = holdings.map(h => h.symbol);
    console.log(`📊 获取股票价格: ${symbols.join(', ')}`);
    const priceData = await mockGetRealTimeStockPrices(symbols);
    
    const stocksData = [];
    let totalValue = 0;
    let totalDailyGain = 0;
    
    console.log(`\n📈 个股收益计算:`);
    for (const holding of holdings) {
        const priceInfo = priceData[holding.symbol];
        if (!priceInfo) {
            console.log(`⚠️  无法获取 ${holding.symbol} 的价格信息`);
            continue;
        }
        
        const currentPrice = priceInfo.price;
        const previousClose = priceInfo.previousClose;
        const dailyChangePercent = priceInfo.changePercent;
        
        // 计算价值
        const value = holding.shares * currentPrice;
        const yesterdayValue = holding.shares * previousClose;
        const dailyGain = value - yesterdayValue;
        const dailyGainPercent = yesterdayValue > 0 ? (dailyGain / yesterdayValue) * 100 : 0;
        
        stocksData.push({
            name: holding.name,
            symbol: holding.symbol,
            shares: holding.shares,
            currentPrice: currentPrice,
            previousClose: previousClose,
            value: value,
            dailyGain: dailyGain,
            dailyGainPercent: dailyGainPercent,
            marketChangePercent: dailyChangePercent
        });
        
        totalValue += value;
        totalDailyGain += dailyGain;
        
        console.log(`  ${holding.name} (${holding.symbol}):`);
        console.log(`    持仓: ${holding.shares} 股`);
        console.log(`    价格: $${previousClose.toFixed(2)} → $${currentPrice.toFixed(2)} (${dailyChangePercent.toFixed(2)}%)`);
        console.log(`    价值: $${yesterdayValue.toFixed(2)} → $${value.toFixed(2)}`);
        console.log(`    当日收益: $${dailyGain.toFixed(2)} (${dailyGainPercent.toFixed(2)}%)`);
    }
    
    // 计算总的当日收益率
    const totalPreviousValue = totalValue - totalDailyGain;
    const totalDailyGainPercent = totalPreviousValue > 0 ? (totalDailyGain / totalPreviousValue) * 100 : 0;
    
    console.log(`\n💰 总体收益:`);
    console.log(`  昨日总价值: $${totalPreviousValue.toFixed(2)}`);
    console.log(`  今日总价值: $${totalValue.toFixed(2)}`);
    console.log(`  当日收益: $${totalDailyGain.toFixed(2)} (${totalDailyGainPercent.toFixed(2)}%)`);
    
    return {
        stocksData,
        totalValue,
        totalDailyGain,
        totalDailyGainPercent
    };
}

// 主测试函数
async function runTest() {
    console.log(`🧪 开始本地持仓计算测试\n`);
    
    const testDate = "2025-06-25";
    
    try {
        // 1. 计算持仓
        const holdings = calculateSimpleHoldings(mockStocksData, mockTransactionsData, testDate);
        
        // 2. 计算当日收益
        const result = await calculateDailyReturns(holdings, testDate);
        
        // 3. 输出最终结果
        console.log(`\n🎯 最终快照数据:`);
        console.log(`日期: ${testDate}`);
        console.log(`总价值: $${result.totalValue.toFixed(2)}`);
        console.log(`当日收益: $${result.totalDailyGain.toFixed(2)} (${result.totalDailyGainPercent.toFixed(2)}%)`);
        console.log(`持仓股票: ${result.stocksData.length} 只`);
        
        console.log(`\n📊 个股详情:`);
        result.stocksData.forEach(stock => {
            console.log(`${stock.name}: ${stock.dailyGainPercent.toFixed(2)}%`);
        });
        
        console.log(`\n✅ 测试完成！`);
        
    } catch (error) {
        console.error(`❌ 测试失败:`, error);
    }
}

// 运行测试
if (require.main === module) {
    runTest();
}

module.exports = { calculateSimpleHoldings, calculateDailyReturns, mockGetRealTimeStockPrices };
