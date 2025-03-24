import yfinance as yf
import time
import json
import os

# 文件路径
symbols_path = os.path.join(os.path.dirname(__file__), '../public/data/symbols.json')
prices_path = os.path.join(os.path.dirname(__file__), '../public/data/prices.json')

# 读取股票列表
with open(symbols_path, 'r') as f:
    symbols_data = json.load(f)

prices_data = {}
exchange_rates = {}  # 用于缓存汇率，避免重复请求

# 获取股票价格并处理
for stock in symbols_data['stocks']:
    symbol = stock['symbol']
    print(f"获取 {stock['name']} ({symbol}) 的价格...")
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        price = info['regularMarketPrice']  # 股票价格
        currency = info['currency']  # 股票的交易货币

        if currency == 'USD':
            # 如果货币是 USD，无需转换
            usd_price = price
            prices_data[symbol] = {
                'price': usd_price,
                'name': stock['name'],
                'lastUpdated': time.strftime('%Y-%m-%d')
            }
        else:
            # 如果货币不是 USD，获取汇率并转换
            if currency not in exchange_rates:
                print(f"获取 {currency}/USD 汇率...")
                currency_pair = yf.Ticker(f"{currency}USD=X")
                exchange_rate = currency_pair.info['regularMarketPrice']
                exchange_rates[currency] = exchange_rate
                # 将汇率添加到 prices_data
                prices_data[currency] = {
                    'price': exchange_rate,
                    'name': f"{currency}-USD",
                    'lastUpdated': time.strftime('%Y-%m-%d')
                }
                time.sleep(10)  # 在获取汇率后等待 10 秒，避免频繁请求
            usd_price = price * exchange_rates[currency]
            prices_data[symbol] = {
                'price': usd_price,          # 转换为 USD 的价格
                'originalPrice': price,      # 原始货币价格
                'currency': currency,        # 原始货币代码
                'name': stock['name'],
                'lastUpdated': time.strftime('%Y-%m-%d')
            }

        print(f"{stock['name']} ({symbol}): {currency} {price} -> USD {usd_price}")
    except Exception as e:
        print(f"获取 {symbol} 失败: {e}")
    time.sleep(10)  # 在每次股票数据请求后等待 10 秒

# 保存价格数据
with open(prices_path, 'w') as f:
    json.dump(prices_data, f, indent=2)
    