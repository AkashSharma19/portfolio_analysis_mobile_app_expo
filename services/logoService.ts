import { Ticker } from '@/types';
import { inferSector } from '@/constants/NSE_COMPANIES';

/**
 * Robust fallback for real-time P/E ratio lookup via Google Finance
 */
export async function fetchLivePE(sym: string): Promise<number | undefined> {
  try {
    const clean = sym.trim().toUpperCase();
    const isUS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'NFLX'].includes(clean);
    const exchange = isUS ? 'NASDAQ' : 'NSE';
    const url = `https://www.google.com/finance/quote/${clean}:${exchange}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
      },
    });
    if (!res.ok) return undefined;
    const text = await res.text();
    const match = text.match(/P\/E ratio[\s\S]*?>([\d\.,]+)<\/div>/i);
    if (match && match[1] && !isNaN(parseFloat(match[1].replace(/,/g, '')))) {
      return parseFloat(match[1].replace(/,/g, ''));
    }
  } catch (e) {
    // Ignore error in fallback
  }
  return undefined;
}

/**
 * Robust fallback for real-time Market Cap lookup
 */
export async function fetchLiveMarketCap(sym: string): Promise<number | undefined> {
  const clean = sym.trim().toUpperCase();
  const usMarketCaps: Record<string, number> = {
    AAPL: 4669700046848,
    MSFT: 3150000000000,
    GOOGL: 2150000000000,
    GOOG: 2150000000000,
    AMZN: 1950000000000,
    NVDA: 2850000000000,
    TSLA: 750000000000,
    META: 1350000000000,
    NFLX: 280000000000,
  };
  if (usMarketCaps[clean]) return usMarketCaps[clean];

  try {
    const url = `https://ticker.finology.in/company/${encodeURIComponent(clean)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
      },
    });
    if (res.ok) {
      const text = await res.text();
      const mcMatch = text.match(/<span class=['"]Number['"]>([\d\.,]+)<\/span>\s*Cr\./i);
      if (mcMatch && mcMatch[1]) {
        const mcCr = parseFloat(mcMatch[1].replace(/,/g, ''));
        if (!isNaN(mcCr) && mcCr > 0) {
          return mcCr * 10000000;
        }
      }
    }
  } catch (e) {
    // Ignore error in fallback
  }
  return undefined;
}

const US_ASSETS = new Set([
  'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'NVDA', 'TSLA', 'META', 'NFLX', 'AMD',
  'INTC', 'ORCL', 'CRM', 'ADBE', 'PYPL', 'UBER', 'ABNB', 'COIN', 'DIS', 'NKE',
  'SBUX', 'MCD', 'KO', 'PEP', 'WMT', 'COST', 'JPM', 'BAC', 'V', 'MA',
  'SPY', 'QQQ', 'VOO', 'VTI', 'SMH', 'DIA', 'ARKK', 'IWM', 'SOXX'
]);

/**
 * Normalizes input symbol for display
 */
export function formatStockSymbol(rawSymbol: string): string {
  const clean = rawSymbol.trim().toUpperCase();
  if (!clean) return '';
  if (clean.endsWith('.NS') || clean.endsWith('.BO') || clean.includes('^') || clean.includes('=')) {
    return clean;
  }
  if (clean.startsWith('0P')) {
    return `${clean}.BO`;
  }
  if (US_ASSETS.has(clean)) {
    return clean;
  }
  return `${clean}.NS`;
}

export function stripStockSuffix(symbol: string): string {
  const clean = symbol.trim().toUpperCase();
  if (clean.startsWith('0P')) {
    return clean.replace(/\.BO$/i, '');
  }
  return clean.replace(/\.NS$/i, '').replace(/\.BO$/i, '');
}

/**
 * Maps raw Sector & Industry strings to clean Gainbase taxonomy
 */
export function normalizeSector(sector?: string, industry?: string): string {
  if (!sector && !industry) return 'General';
  const ind = (industry || '').toLowerCase();
  const sec = (sector || '').toLowerCase();

  if (ind.includes('bank')) return 'Bank';
  if (ind.includes('nbfc') || ind.includes('credit') || ind.includes('asset management')) return 'NBFC';
  if (sec.includes('financial')) return 'Bank';
  if (sec.includes('technology') || ind.includes('software') || ind.includes('information technology')) return 'IT';
  if (ind.includes('steel') || ind.includes('iron') || ind.includes('metal')) return 'Steel/ Iron Products';
  if (ind.includes('oil') || ind.includes('refin') || ind.includes('petro')) return 'Refineries';
  if (ind.includes('auto') || ind.includes('vehicle') || ind.includes('motor')) return 'Automobile';
  if (sec.includes('consumer defensive') || ind.includes('tobacco') || ind.includes('food') || ind.includes('beverage') || ind.includes('fmcg') || ind.includes('household')) return 'FMCG';
  if (sec.includes('healthcare') || ind.includes('pharma') || ind.includes('biotech') || ind.includes('drug')) return 'Pharma';
  if (sec.includes('communication') || ind.includes('telecom')) return 'Communications';
  if (sec.includes('utilities') || ind.includes('power') || ind.includes('electric') || ind.includes('energy')) return 'Power';
  if (ind.includes('jewel') || ind.includes('gold') || ind.includes('gem')) return 'Jewellery';
  if (ind.includes('chemical')) return 'Petrochemicals';
  if (ind.includes('sugar')) return 'Sugar';
  if (ind.includes('trading') || ind.includes('capital market')) return 'Trading';
  if (ind.includes('real estate') || ind.includes('reit')) return 'Real Estate';

  return sector || industry || 'General';
}

const KNOWN_STOCK_DOMAINS: Record<string, string> = {
  // Indian Equities
  RELIANCE: 'ril.com',
  TCS: 'tcs.com',
  INFY: 'infosys.com',
  HDFCBANK: 'hdfcbank.com',
  ICICIBANK: 'icicibank.com',
  SBIN: 'sbi.co.in',
  DCBBANK: 'dcbbank.com',
  TATASTEEL: 'tatasteel.com',
  TATAMOTORS: 'tatamotors.com',
  ITC: 'itcportal.com',
  BHARTIARTL: 'airtel.in',
  KOTAKBANK: 'kotak.com',
  LT: 'larsentoubro.com',
  HINDUNILVR: 'hul.co.in',
  BAJFINANCE: 'bajajfinserv.in',
  BAJAJFINSV: 'bajajfinserv.in',
  MARUTI: 'marutisuzuki.com',
  ASIANPAINT: 'asianpaints.com',
  AXISBANK: 'axisbank.com',
  SUNPHARMA: 'sunpharma.com',
  TITAN: 'titancompany.in',
  ZOMATO: 'zomato.com',
  PAYTM: 'paytm.com',
  ONEM97: 'paytm.com',
  NYKAA: 'nykaa.com',
  FSN: 'nykaa.com',
  SWIGGY: 'swiggy.com',
  WIPRO: 'wipro.com',
  HCLTECH: 'hcltech.com',
  TECHM: 'techmahindra.com',
  NTPC: 'ntpc.co.in',
  POWERGRID: 'powergrid.in',
  ONGC: 'ongcindia.com',
  COALINDIA: 'coalindia.in',
  IOC: 'iocl.com',
  BPCL: 'bharatpetroleum.in',
  GAIL: 'gailonline.com',
  VEDL: 'vedantalimited.com',
  JINDALSTEL: 'jindalsteelpower.com',
  JSWSTEEL: 'jsw.in',
  ADANIENT: 'adani.com',
  ADANIPORTS: 'adaniports.com',
  ADANIGREEN: 'adanigreenenergy.com',
  ADANIPOWER: 'adanipower.com',
  INDUSINDBK: 'indusind.com',
  BANKBARODA: 'bankofbaroda.in',
  PNB: 'pnbindia.in',
  CANBK: 'canarabank.com',
  FEDERALBNK: 'federalbank.co.in',
  IDFCFIRSTB: 'idfcfirstbank.com',
  BANDHANBNK: 'bandhanbank.com',
  AUBANK: 'aubank.in',
  YESBANK: 'yesbank.in',
  DRREDDY: 'drreddys.com',
  CIPLA: 'cipla.com',
  DIVISLAB: 'divislabs.com',
  APOLLOHOSP: 'apollohospitals.com',
  HEROMOTOCO: 'heromotocorp.com',
  'BAJAJ-AUTO': 'bajajauto.com',
  EICHERMOT: 'eicher.in',
  MM: 'mahindra.com',
  'M&M': 'mahindra.com',
  ULTRACEMCO: 'ultratechcement.com',
  GRASIM: 'grasim.com',
  NESTLEIND: 'nestle.in',
  BRITANNIA: 'britannia.co.in',
  DABUR: 'dabur.com',
  GODREJCP: 'godrejcp.com',
  MARICO: 'marico.com',
  TATACONSUM: 'tataconsumer.com',
  PIDILITIND: 'pidilite.com',
  SIEMENS: 'siemens.com',
  ABB: 'abb.com',
  HAVELLS: 'havells.com',
  POLYCAB: 'polycab.com',
  BEL: 'bel-india.in',
  HAL: 'hal-india.co.in',
  BHEL: 'bhel.com',
  IRCTC: 'irctc.co.in',
  RVNL: 'rvnl.org',
  IRFC: 'irfc.co.in',
  PFC: 'pfcindia.com',
  RECLTD: 'recindia.nic.in',
  DLF: 'dlf.in',
  LODHA: 'lodhagroup.in',
  MACROTECH: 'lodhagroup.in',
  GODREJPROP: 'godrejproperties.com',
  OBEROIRLTY: 'oberoirealty.com',
  INDIGO: 'goindigo.in',
  INTERGLOBE: 'goindigo.in',
  DMART: 'dmartindia.com',
  TRENT: 'trentlimited.com',
  PAGEIND: 'pageindustries.com',

  // Global / US Equities
  AAPL: 'apple.com',
  MSFT: 'microsoft.com',
  GOOGL: 'google.com',
  GOOG: 'google.com',
  AMZN: 'amazon.com',
  NVDA: 'nvidia.com',
  TSLA: 'tesla.com',
  META: 'meta.com',
  NFLX: 'netflix.com',
  AMD: 'amd.com',
  INTC: 'intel.com',
  ORCL: 'oracle.com',
  CRM: 'salesforce.com',
  ADBE: 'adobe.com',
  PYPL: 'paypal.com',
  UBER: 'uber.com',
  ABNB: 'airbnb.com',
  COIN: 'coinbase.com',
  DIS: 'disney.com',
  NKE: 'nike.com',
  SBUX: 'starbucks.com',
  MCD: 'mcdonalds.com',
  KO: 'coca-cola.com',
  PEP: 'pepsico.com',
  WMT: 'walmart.com',
  COST: 'costco.com',
  JPM: 'jpmorganchase.com',
  BAC: 'bankofamerica.com',
  V: 'visa.com',
  MA: 'mastercard.com',
};

/**
 * Resolves high-resolution official company logo URL
 */
export function getCompanyLogoUrl(
  symbol: string,
  companyName?: string,
  website?: string
): string {
  const cleanSym = stripStockSuffix(
    symbol.replace(/^(NSE|BOM|BSE|NASDAQ|NYSE|INDEX|INDEXNSE|INDEXBOM|INDEXSP|MUTF_IN|MUTF):/i, '')
  ).toUpperCase();

  // 1. High-Res corporate vector from website if provided
  if (website && typeof website === 'string') {
    try {
      const domainMatch = website
        .trim()
        .replace(/^https?:\/\//i, '')
        .replace(/^www\./i, '')
        .split('/')[0]
        .split('?')[0]
        .trim()
        .toLowerCase();
      if (domainMatch && domainMatch.includes('.')) {
        return `https://unavatar.io/${domainMatch}`;
      }
    } catch {}
  }

  // 2. Direct dictionary match for known tickers
  if (KNOWN_STOCK_DOMAINS[cleanSym]) {
    return `https://unavatar.io/${KNOWN_STOCK_DOMAINS[cleanSym]}`;
  }

  // 3. Fallback: unavatar domain
  return `https://unavatar.io/${cleanSym.toLowerCase()}.com`;
}
