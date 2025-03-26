// 股票数据类型定义
export interface Stock {
    name: string;
    shares: number;
    price: number;
    costPrice: number;
    id: string;
    symbol?: string;
}

// 现金交易类型定义
export interface CashTransaction {
    amount: number;
    type: 'deposit' | 'withdraw' | 'buy' | 'sell';
    date: string;
    stockName?: string;
    description?: string;
}

// 股票交易类型定义
export interface StockTransaction {
    stockName: string;
    type: 'buy' | 'sell';
    shares: number;
    price: number;
    date: string;
}

// 年度数据类型定义
export interface YearData {
    stocks: Stock[];
    cashTransactions: CashTransaction[];
    stockTransactions: StockTransaction[];
    cashBalance: number;
}

// 股票代码类型定义
export interface StockSymbol {
    symbol: string;
    name: string;
}

// 价格数据类型定义
export interface PriceData {
    [symbol: string]: {
        price: number;
        hkdPrice?: number;
        name: string;
        currency?: string;
        lastUpdated: string;
    };
}

// 警告信息类型定义
export interface AlertInfo {
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm?: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
}

// 编辑行数据类型定义
export interface EditedRowData {
    [year: string]: { 
        quantity: string; 
        unitPrice: string; 
        costPrice: string; 
        symbol?: string 
    };
}

// 年度增长数据类型定义
export interface YearGrowthData {
    actualGrowth: number;
    actualGrowthRate: number;
    investmentGrowth: number;
    investmentGrowthRate: number;
    yearDeposits: number;
}

// 表格数据类型定义
export interface TableData {
    headers: string[];
    rows: any[][];
    totalRow: any[];
}
