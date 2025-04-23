export interface RequestHeaders extends Record<string, string | undefined> {
    'Content-Type': string;
    Authorization?: string;
}

export interface User {
    username: string;
    email?: string;
    uuid: string;
    createdAt?: string;
    lastLogin?: string;
}

export interface Stock {
    name: string;
    shares: number;
    price: number;
    costPrice: number;
    id: string;
    symbol?: string;
    userUuid?: string;
}

export interface CashTransaction {
    amount: number;
    type: 'deposit' | 'withdraw' | 'buy' | 'sell';
    date: string;
    stockName?: string;
    description?: string;
    userUuid?: string;
}

export interface StockTransaction {
    stockName: string;
    type: 'buy' | 'sell';
    shares: number;
    price: number;
    date: string;
    beforeCostPrice?: number;
    afterCostPrice?: number;
    userUuid?: string;
}

export interface YearData {
    stocks: Stock[];
    cashTransactions: CashTransaction[];
    stockTransactions: StockTransaction[];
    cashBalance: number;
}

export interface StockSymbol {
    symbol: string;
    name: string;
}

export interface PriceData {
    [symbol: string]: {
        price: number;
        hkdPrice?: number;
        name: string;
        currency?: string;
        lastUpdated: string;
    };
}

export interface YearlyStockValues {
    [stockName: string]: number;
    total: number;
}

export interface StockTransactions {
    [year: string]: StockTransaction[];
}

export interface CashTransactions {
    [year: string]: CashTransaction[];
}

export interface StocksData {
    [year: string]: Stock[];
}

export interface PartialYearData {
    stocks?: Stock[];
    cashTransactions?: CashTransaction[];
    stockTransactions?: StockTransaction[];
    cashBalance: number;
}

export interface IncrementalChanges {
    stocks: StocksData;
    cashTransactions: CashTransactions;
    stockTransactions: StockTransactions;
    yearlySummaries: { [year: string]: PartialYearData };
}

export interface ExchangeRates {
    USD: number;
    HKD: number;
    CNY: number;
    [key: string]: number;
}

export interface AlertInfo {
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm?: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
}

export interface StockChartData {
    [key: string]: number | string;
    name: string;
}

export interface TableCell {
    visibility?: boolean;
    name?: string;
    symbol?: string;
    shares?: number;
    price?: number;
    costPrice?: number;
}

export interface ChartValue {
    value: number;
    toFixed: (digits: number) => string;
}

export interface StockValueMap {
    [key: string]: number;
}