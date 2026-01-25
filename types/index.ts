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
  'Sector'?: string;
}

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  profitAmount: number;
  profitPercentage: number;
  totalReturn: number;
  xirr: number;
}
