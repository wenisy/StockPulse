"use client";
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CashTransactionFormProps {
  cashTransactionAmount: string;
  setCashTransactionAmount: (amount: string) => void;
  cashTransactionType: 'deposit' | 'withdraw';
  setCashTransactionType: (type: 'deposit' | 'withdraw') => void;
  onAddCashTransaction: () => void;
}

// 现金交易表单组件
const CashTransactionForm = ({
  cashTransactionAmount,
  setCashTransactionAmount,
  cashTransactionType,
  setCashTransactionType,
  onAddCashTransaction
}: CashTransactionFormProps) => {
  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
      <h2 className="text-xl font-semibold">添加现金交易</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">交易类型</label>
          <Select value={cashTransactionType} onValueChange={(value: 'deposit' | 'withdraw') => setCashTransactionType(value)}>
            <SelectTrigger>
              <SelectValue placeholder="选择交易类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="deposit">存入</SelectItem>
              <SelectItem value="withdraw">取出</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">金额</label>
          <Input
            type="number"
            value={cashTransactionAmount}
            onChange={(e) => setCashTransactionAmount(e.target.value)}
            placeholder="输入金额"
            step="0.01"
          />
        </div>
      </div>
      <Button onClick={onAddCashTransaction} className="w-full">
        添加交易
      </Button>
    </div>
  );
};

export default CashTransactionForm;
