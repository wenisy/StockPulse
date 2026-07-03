'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Section } from '@/components/ui/section';
import { usePortfolio } from '@/components/shell/PortfolioContext';

interface CashTransactionFormProps {
  onClose: () => void;
}

export function CashTransactionForm({ onClose }: CashTransactionFormProps) {
  const { portfolioData, trackerState, callbacks } = usePortfolio();
  const { yearData, years, selectedYear, setSelectedYear, formatLargeNumber } = portfolioData;
  const {
    currency,
    cashTransactionAmount,
    setCashTransactionAmount,
    cashTransactionType,
    setCashTransactionType,
    isCashTransactionLoading,
  } = trackerState;

  const sortedYears = [...years].sort((a, b) => parseInt(b) - parseInt(a));
  const cashBalance = yearData[selectedYear]?.cashBalance ?? 0;

  const parsedAmount = parseFloat(cashTransactionAmount);
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount > 0;

  const submitCash = async () => {
    const ok = await callbacks.addCashTransaction();
    if (ok) onClose();
  };

  return (
    <Section className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-fg">现金操作</h3>
        <span className="text-xs text-fg-muted">
          {selectedYear} 年现金余额：
          <span
            className={`ml-1 font-semibold tabular-nums ${
              cashBalance >= 0 ? 'text-success' : 'text-danger'
            }`}
          >
            {formatLargeNumber(cashBalance, currency)}
          </span>
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
              <option key={y} value={y}>
                {y} 年
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-fg-subtle">类型</span>
          <select
            value={cashTransactionType}
            onChange={(e) =>
              setCashTransactionType(e.target.value as 'deposit' | 'withdraw')
            }
            className="h-9 rounded-md border border-border-default bg-bg px-2 text-sm text-fg"
          >
            <option value="deposit">存入（入金）</option>
            <option value="withdraw">取出</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-fg-subtle">金额</span>
          <Input
            value={cashTransactionAmount}
            inputMode="decimal"
            placeholder="输入金额"
            onChange={(e) => setCashTransactionAmount(e.target.value)}
          />
        </label>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          取消
        </Button>
        <Button
          onClick={submitCash}
          disabled={!isValidAmount || isCashTransactionLoading}
          className="bg-brand text-brand-fg hover:bg-brand/90"
        >
          {isCashTransactionLoading ? '处理中…' : '添加现金交易'}
        </Button>
      </div>
    </Section>
  );
}