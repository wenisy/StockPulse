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

interface YearFormProps {
  years: string[];
  selectedYear: string;
  onYearChange: (year: string) => void;
  newYear: string;
  setNewYear: (year: string) => void;
  onAddYear: () => void;
}

// 年份表单组件
const YearForm = ({
  years,
  selectedYear,
  onYearChange,
  newYear,
  setNewYear,
  onAddYear
}: YearFormProps) => {
  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
      <h2 className="text-xl font-semibold">年份选择</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">选择年份</label>
          <Select value={selectedYear} onValueChange={onYearChange}>
            <SelectTrigger>
              <SelectValue placeholder="选择年份" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}年
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">添加新年份</label>
          <div className="flex gap-2">
            <Input
              type="text"
              value={newYear}
              onChange={(e) => setNewYear(e.target.value)}
              placeholder="输入年份"
              className="flex-1"
            />
            <Button onClick={onAddYear}>添加</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default YearForm;
