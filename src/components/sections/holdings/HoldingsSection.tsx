'use client';

import { useMemo, useState } from 'react';
import { Inbox, Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Section } from '@/components/ui/section';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/combobox';
import { EmptyState } from '@/components/ui/empty-state';
import { usePortfolio } from '@/components/shell/PortfolioContext';
import { StockHoldingCard } from './StockHoldingCard';
import { HoldingDetailDrawer } from './HoldingDetailDrawer';

export function HoldingsSection() {
  const { stockOperations, portfolioData, callbacks } = usePortfolio();
  const { latestYear, yearData, years } = portfolioData;

  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const {
    newStockName,
    newStockSymbol,
    newShares,
    newPrice,
    newYearEndPrice,
    transactionType,
    setNewStockName,
    setNewStockSymbol,
    setNewShares,
    setNewPrice,
    setNewYearEndPrice,
    setTransactionType,
  } = stockOperations;

  // 所有出现过的股票名（跨所有年份）
  const allStockNames = useMemo(() => {
    const names = new Set<string>();
    years.forEach((year) => {
      yearData[year]?.stocks?.forEach((s) => names.add(s.name));
    });
    // 按最新年末市值降序排列
    return [...names].sort((a, b) => {
      const aStk = yearData[latestYear]?.stocks?.find((s) => s.name === a);
      const bStk = yearData[latestYear]?.stocks?.find((s) => s.name === b);
      const aVal = aStk ? aStk.shares * aStk.price : 0;
      const bVal = bStk ? bStk.shares * bStk.price : 0;
      return bVal - aVal;
    });
  }, [years, yearData, latestYear]);

  // 联动：从 latestYear 持仓派生股票名 / symbol 选项
  const nameOptions = useMemo(
    () =>
      yearData[latestYear]?.stocks?.map((s) => ({
        label: s.name,
        value: s.name,
      })) ?? [],
    [yearData, latestYear],
  );

  const symbolOptions = useMemo(
    () =>
      yearData[latestYear]?.stocks
        ?.map((s) => ({ label: s.symbol || '', value: s.symbol || '' }))
        .filter((o) => o.value) ?? [],
    [yearData, latestYear],
  );

  const onSelectName = (value: string) => {
    setNewStockName(value);
    const matched = yearData[latestYear]?.stocks?.find((s) => s.name === value);
    if (matched) setNewStockSymbol(matched.symbol || '');
  };

  const onSelectSymbol = (value: string) => {
    setNewStockSymbol(value);
    const matched = yearData[latestYear]?.stocks?.find((s) => s.symbol === value);
    if (matched) setNewStockName(matched.name);
  };

  const submitNewTx = () => {
    callbacks.onAddStock();
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="持仓"
        description={`${allStockNames.length} 只股票 · 历年走势`}
        actions={
          <Button
            size="sm"
            onClick={() => setShowForm((v) => !v)}
            className="bg-brand text-brand-fg hover:bg-brand/90"
          >
            <Plus className="h-4 w-4" />
            添加交易
          </Button>
        }
      />

      {/* 添加交易表单 */}
      {showForm ? (
        <Section className="p-4">
          <h3 className="mb-3 text-sm font-semibold text-fg">新交易</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-fg-subtle">类型</span>
              <select
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value as 'buy' | 'sell')}
                className="h-9 rounded-md border border-border-default bg-bg px-2 text-sm text-fg"
              >
                <option value="buy">买入</option>
                <option value="sell">卖出</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-fg-subtle">股票名</span>
              <Combobox
                options={nameOptions}
                value={newStockName}
                onChange={onSelectName}
                placeholder="选择或输入股票名"
                allowCustomInput
                customInputPlaceholder="输入新股票名…"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-fg-subtle">Symbol</span>
              <Combobox
                options={symbolOptions}
                value={newStockSymbol}
                onChange={onSelectSymbol}
                placeholder="选择或输入代码"
                allowCustomInput
                customInputPlaceholder="输入新代码…"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-fg-subtle">股数</span>
              <Input
                value={newShares}
                inputMode="decimal"
                onChange={(e) => setNewShares(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-fg-subtle">价格</span>
              <Input
                value={newPrice}
                inputMode="decimal"
                onChange={(e) => setNewPrice(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-fg-subtle">年末价（可选）</span>
              <Input
                value={newYearEndPrice}
                inputMode="decimal"
                onChange={(e) => setNewYearEndPrice(e.target.value)}
              />
            </label>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>
              取消
            </Button>
            <Button
              onClick={submitNewTx}
              className="bg-brand text-brand-fg hover:bg-brand/90"
            >
              确认
            </Button>
          </div>
        </Section>
      ) : null}

      {/* 股票卡片网格 */}
      {allStockNames.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="暂无持仓记录"
          description="点击「添加交易」开始追踪你的第一只股票"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {allStockNames.map((name) => (
            <StockHoldingCard
              key={name}
              stockName={name}
              onEdit={setEditing}
            />
          ))}
        </div>
      )}

      {/* 编辑抽屉（按年修改） */}
      <HoldingDetailDrawer stockName={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
