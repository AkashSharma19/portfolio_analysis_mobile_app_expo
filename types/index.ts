export type TransactionType = 'BUY' | 'SELL';

export interface Transaction {
  id: string;
  symbol: string;
  quantity: number;
  price: number;
  date: string;
  type: TransactionType;
  currency: string;
  broker: string;
}

export interface Ticker {
  Tickers: string;
  'Current Value': number;
  'Company Name': string;
  'Asset Type'?: string;
  Sector?: string;
  'Yesterday Close'?: number;
  High52?: number;
  Low52?: number;
  'Today - 2'?: number;
  'Today - 3'?: number;
  'Today - 4'?: number;
  'Today - 5'?: number;
  'Today - 6'?: number;
  'Today - 7'?: number;
  'Today - 365'?: number;
  Logo?: string;
}

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  profitAmount: number;
  profitPercentage: number;
  totalReturn: number;
  xirr: number;
  dayChange: number;
  dayChangePercentage: number;
  realizedReturn: number;
  unrealizedReturn: number;
  oneYearReturn?: number;
}
export interface YearlyAnalysis {
  year: number;
  investment: number;
  averageMonthlyInvestment: number;
  percentageIncrease: number;
  assetDistribution: { name: string; value: number; percentage: number }[];
}

export interface MonthlyAnalysis {
  month: string; // e.g., "Jan 2024"
  monthKey: string; // e.g., "2024-01" for sorting
  investment: number;
  percentageIncrease: number;
  assetDistribution: { name: string; value: number; percentage: number }[];
}

export interface Holding {
  symbol: string;
  companyName: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  investedValue: number;
  currentValue: number;
  pnl: number;
  pnlPercentage: number;
  contributionPercentage: number;
  assetType: string;
  sector: string;
  broker: string;
  dayChange: number;
  dayChangePercentage: number;
  high52?: number;
  low52?: number;
  logo?: string;
}

export interface AllocationItem {
  name: string;
  symbol?: string;
  value: number; // current value
  percentage: number;
  totalCost: number;
  pnl: number;
  pnlPercentage: number;
  quantity: number;
  logo?: string;
}
