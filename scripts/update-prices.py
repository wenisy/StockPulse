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

for stock in symbols_data['stocks']:
    symbol = stock['symbol']
    print(f"获取 {stock['name']} ({symbol}) 的价格...")
    try:
        ticker = yf.Ticker(symbol)
        price = ticker.info['regularMarketPrice']
        prices_data[symbol] = {
            'price': price,
            'name': stock['name'],
            'lastUpdated': time.strftime('%Y-%m-%d')
        }
        print(f"{stock['name']} ({symbol}): {price}")
    except Exception as e:
        print(f"获取 {symbol} 失败: {e}")
    time.sleep(20)  # 等待20秒

# 保存价格数据
with open(prices_path, 'w') as f:
    json.dump(prices_data, f, indent=2)