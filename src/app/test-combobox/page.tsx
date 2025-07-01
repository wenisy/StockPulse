"use client";

import { Combobox } from '@/components/ui/combobox';
import { useState } from 'react';

const mockStocks = [
  { label: '苹果公司', value: 'AAPL' },
  { label: '微软公司', value: 'MSFT' },
  { label: '谷歌公司', value: 'GOOGL' },
  { label: '亚马逊公司', value: 'AMZN' },
  { label: '特斯拉公司', value: 'TSLA' },
];

export default function TestComboboxPage() {
  const [selectedStock, setSelectedStock] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState('');

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold">Combobox 测试页面</h1>
      
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">股票名称选择（支持自定义输入）</h2>
          <div className="w-full max-w-md">
            <Combobox
              options={mockStocks}
              value={selectedStock}
              onChange={setSelectedStock}
              placeholder="选择或输入股票名称..."
              allowCustomInput={true}
              customInputPlaceholder="输入新股票名称..."
            />
          </div>
          <p className="mt-2 text-sm text-gray-600">
            当前选择: <span className="font-mono">{selectedStock || '无'}</span>
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">股票代码选择（支持自定义输入）</h2>
          <div className="w-full max-w-md">
            <Combobox
              options={mockStocks.map(stock => ({ label: stock.value, value: stock.value }))}
              value={selectedSymbol}
              onChange={setSelectedSymbol}
              placeholder="选择或输入股票代码..."
              allowCustomInput={true}
              customInputPlaceholder="输入新股票代码..."
            />
          </div>
          <p className="mt-2 text-sm text-gray-600">
            当前选择: <span className="font-mono">{selectedSymbol || '无'}</span>
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">仅选择模式（不支持自定义输入）</h2>
          <div className="w-full max-w-md">
            <Combobox
              options={mockStocks}
              value={selectedStock}
              onChange={setSelectedStock}
              placeholder="仅从列表中选择..."
              allowCustomInput={false}
            />
          </div>
        </div>

        <div className="p-4 bg-gray-100 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">使用说明</h3>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>点击下拉框可以看到所有可选项</li>
            <li>在输入框中输入可以搜索过滤选项</li>
            <li>当启用自定义输入时，可以输入不在列表中的新值</li>
            <li>按回车键可以确认自定义输入</li>
            <li>点击选项可以直接选择</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
