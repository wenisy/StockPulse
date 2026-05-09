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
  const { stockOperations, portfolioData, callbacks, trackerState } = usePortfolio();
  const { latestYear, yearData, years, selectedYear, setSelectedYear } = portfolioData;

  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newYearInput, setNewYearInput] = useState('');

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

  const { newYear, setNewYear } = trackerState;

  // 所有出现过的股票名（跨所有年份），按最新年末市值降序
  // 过滤掉"所有年份 shares 均为 0"的空壳条目（数据录入异常产生）
  const allStockNames = useMemo(() => {
    const names = new Set<string>();
    years.forEach((year) => {
      yearData[year]?.stocks?.forEach((s) => {
        // 只收录至少在某一年真正有持仓（shares > 0）的股票
        if (s.shares > 0) names.add(s.name);
      });
    });
    return [...names].sort((a, b) => {
      const aStk = yearData[latestYear]?.stocks?.find((s) => s.name === a);
      const bStk = yearData[latestYear]?.stocks?.find((s) => s.name === b);
      const aVal = aStk ? aStk.shares * aStk.price : 0;
      const bVal = bStk ? bStk.shares * bStk.price : 0;
      return bVal - aVal;
    });
  }, [years, yearData, latestYear]);

  // 分为：当前持仓 vs 历史持仓（已清仓）
  const activeNames = allStockNames.filter((name) => {
    const stk = yearData[latestYear]?.stocks?.find((s) => s.name === name);
    return stk && stk.shares > 0;
  });
  const closedNames = allStockNames.filter((name) => {
    const stk = yearData[latestYear]?.stocks?.find((s) => s.name === name);
    return !stk || stk.shares <= 0;
  });

  // 联动：Combobox 选项从最新年持仓派生
  const nameOptions = useMemo(
    () => yearData[latestYear]?.stocks?.map((s) => ({ label: s.name, value: s.name })) ?? [],
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

  const handleAddYear = () => {
    if (!newYear) return;
    setNewYear(newYear);
    callbacks.addNewYear();
    setNewYearInput('');
  };

  const submitNewTx = () => {
    callbacks.onAddStock();
    setShowForm(false);
  };

  // 年份排序（降序供选择器使用）
  const sortedYears = [...years].sort((a, b) => parseInt(b) - parseInt(a));

  return (
    <div className="space-y-6">
      <PageHeader
        title="持仓"
        description={`${activeNames.length} 只持仓中${closedNames.length > 0 ? ` · ${closedNames.length} 只历史` : ''}`}
        actions={
          <div className="flex items-center gap-2">
            {/* 新增年份 */}
            <div className="flex items-center gap-1">
              <Input
                value={newYear}
                onChange={(e) => setNewYear(e.target.value)}
                placeholder="如 2027"
                className="w-24 h-8 text-sm"
                inputMode="numeric"
                maxLength={4}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddYear}
                disabled={!newYear || years.includes(newYear)}
                className="h-8 px-2 text-xs"
              >
                新增年份
              </Button>
            </div>
            <Button
              size="sm"
              onClick={() => setShowForm((v) => !v)}
              className="bg-brand text-brand-fg hover:bg-brand/90"
            >
              <Plus className="h-4 w-4" />
              添加交易
            </Button>
          </div>
        }
      />

      {/* 添加交易表单 */}
      {showForm ? (
        <Section className="p-4">
          {/* 当前年份余额提示 */}
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-fg">新交易</h3>
            <span className="text-xs text-fg-muted">
              {selectedYear} 年现金余额：
              <span className={`ml-1 font-semibold tabular-nums ${
                (yearData[selectedYear]?.cashBalance ?? 0) >= 0 ? 'text-success' : 'text-danger'
              }`}>
                {portfolioData.formatLargeNumber(
                  yearData[selectedYear]?.cashBalance ?? 0,
                  trackerState.currency,
                )}
              </span>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {/* 年份选择 */}
            <label className="flex flex-col gap-1">
              <span className="text-xs text-fg-subtle">交易年份</span>
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  callbacks.handleYearChange(e.target.value);
                }}
                className="h-9 rounded-md border border-border-default bg-bg px-2 text-sm text-fg"
              >
                {sortedYears.map((y) => (
                  <option key={y} value={y}>{y} 年</option>
                ))}
              </select>
            </label>
            {/* 类型 */}
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
            {/* 股票名 */}
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
            {/* Symbol */}
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
            {/* 股数 */}
            <label className="flex flex-col gap-1">
              <span className="text-xs text-fg-subtle">股数</span>
              <Input
                value={newShares}
                inputMode="decimal"
                onChange={(e) => setNewShares(e.target.value)}
              />
            </label>
            {/* 价格 */}
            <label className="flex flex-col gap-1">
              <span className="text-xs text-fg-subtle">价格</span>
              <Input
                value={newPrice}
                inputMode="decimal"
                onChange={(e) => setNewPrice(e.target.value)}
              />
            </label>
            {/* 年末价 */}
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
            <Button variant="outline" onClick={() => setShowForm(false)}>取消</Button>
            <Button onClick={submitNewTx} className="bg-brand text-brand-fg hover:bg-brand/90">
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
        <div className="space-y-8">
          {/* 区块一：当前持仓 */}
          {activeNames.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                  持仓中
                </span>
                <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                  {activeNames.length}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {activeNames.map((name) => (
                  <StockHoldingCard key={name} stockName={name} onEdit={setEditing} />
                ))}
              </div>
            </div>
          ) : (
            <EmptyState
              icon={Inbox}
              title="当前无持仓"
              description="点击「添加交易」买入第一只股票"
            />
          )}

          {/* 区块二：历史持仓（已清仓） */}
          {closedNames.length > 0 ? (
            <div className="space-y-3">
              {/* 分割线 */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border-subtle" />
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                    历史持仓
                  </span>
                  <span className="rounded-full bg-bg-subtle px-2 py-0.5 text-[11px] font-medium text-fg-subtle">
                    {closedNames.length}
                  </span>
                </div>
                <div className="h-px flex-1 bg-border-subtle" />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 opacity-75">
                {closedNames.map((name) => (
                  <StockHoldingCard key={name} stockName={name} onEdit={setEditing} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}

      <HoldingDetailDrawer stockName={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
