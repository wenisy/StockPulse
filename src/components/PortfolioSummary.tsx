import React from "react";
import GrowthInfo from "./GrowthInfo";

interface PortfolioSummaryProps {
  years: string[];
  totalValues: { [year: string]: number };
  formatLargeNumber: (num: number, currency: string) => string;
  currency: string;
  handleReportClick: (year: string) => void;
}

const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({
  years,
  totalValues,
  formatLargeNumber,
  currency,
  handleReportClick,
}) => {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">总持仓概览</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.keys(totalValues).map((year) => (
          <div
            key={year}
            className="p-4 border rounded-lg shadow bg-white cursor-pointer"
            onClick={() => handleReportClick(year)}
            data-testid={`report-button-${year}`}
          >
            <h3 className="text-lg font-medium">{year}年总持仓</h3>
            <p className="text-2xl font-bold text-blue-600">
              {formatLargeNumber(totalValues[year], currency)}
            </p>
            <GrowthInfo
              year={year}
              years={years}
              yearData={{}} // 需要从父组件传递
              formatLargeNumber={(value, curr) =>
                formatLargeNumber(value, curr || currency)
              }
              currency={currency}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default PortfolioSummary;