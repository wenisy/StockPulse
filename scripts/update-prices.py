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

# 获取 HKD/USD 汇率
currency_pair = yf.Ticker("HKDUSD=X")
exchange_rate = currency_pair.info['regularMarketPrice']
print(f"当前 HKD/USD 汇率: {exchange_rate}")

prices_data = {}

# 添加 HKD/USD 汇率到 prices_data
prices_data["HKD"] = {
    "price": exchange_rate,
    "name": "HKD-USD",
    "lastUpdated": time.strftime('%Y-%m-%d')
}

# 获取股票价格并处理
for stock in symbols_data['stocks']:
    symbol = stock['symbol']
    print(f"获取 {stock['name']} ({symbol}) 的价格...")
    try:
        ticker = yf.Ticker(symbol)
        price_info = ticker.info
        price = price_info['regularMarketPrice']
        
        if symbol.endswith('.HK'):
            # 港股：转换价格
            hkd_price = price
            usd_price = hkd_price * exchange_rate
            prices_data[symbol] = {
                'price': usd_price,
                'hkdPrice': hkd_price,
                'name': stock['name'],
                'lastUpdated': time.strftime('%Y-%m-%d')
            }
            print(f"{stock['name']} ({symbol}): HKD {hkd_price} -> USD {usd_price}")
        else:
            # 非港股
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