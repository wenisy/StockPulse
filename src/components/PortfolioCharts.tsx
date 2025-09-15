import React from "react";
import StockCharts from "./StockCharts";

interface PortfolioChartsProps {
  showPositionChart: boolean;
  setShowPositionChart: (show: boolean) => void;
  lineChartData: { [key: string]: string | number }[];
  barChartData: { name: string; [key: string]: string | number }[];
  years: string[];
  hiddenStocks: { [stockName: string]: boolean };
  hiddenSeries: { [dataKey: string]: boolean };
  handleLegendClick: (data: { value: string }) => void;
  formatLargeNumber: (num: number, currency: string) => string;
  currency: string;
}

const PortfolioCharts: React.FC<PortfolioChartsProps> = ({
  showPositionChart,
  setShowPositionChart,
  lineChartData,
  barChartData,
  years,
  hiddenStocks,
  hiddenSeries,
  handleLegendClick,
  formatLargeNumber,
  currency,
}) => {
  return (
    <StockCharts
      showPositionChart={showPositionChart}
      setShowPositionChart={setShowPositionChart}
      lineChartData={lineChartData}
      barChartData={barChartData}
      years={years}
      hiddenStocks={hiddenStocks}
      hiddenSeries={hiddenSeries}
      handleLegendClick={handleLegendClick}
      formatLargeNumber={formatLargeNumber}
      currency={currency}
    />
  );
};

export default PortfolioCharts;