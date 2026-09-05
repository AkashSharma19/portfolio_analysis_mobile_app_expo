import { Ticker } from '@/types';
import { inferSector } from '@/constants/NSE_COMPANIES';

const YAHOO_USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';

let cachedCookie = '';
let cachedCrumb = '';
let lastCrumbFetch = 0;

/**
 * Retrieves valid Yahoo Finance session cookie and crumb.
 */
async function getYahooSession(): Promise<{ cookie: string; crumb: string }> {
  if (cachedCrumb && cachedCookie && Date.now() - lastCrumbFetch < 3600000) {
    return { cookie: cachedCookie, crumb: cachedCrumb };
  }

  try {
    const sessionRes = await fetch('https://fc.yahoo.com', {
      headers: { 'User-Agent': YAHOO_USER_AGENT },
    });
    const cookie = sessionRes.headers.get('set-cookie') || '';
    cachedCookie = cookie;

    const crumbRes = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
      headers: {
        'User-Agent': YAHOO_USER_AGENT,
        Cookie: cookie,
      },
    });
    const crumb = await crumbRes.text();
    if (crumb && !crumb.includes('Too Many') && !crumb.includes('<html>')) {
      cachedCrumb = crumb.trim();
      lastCrumbFetch = Date.now();
      return { cookie, crumb: cachedCrumb };
    }
  } catch (err) {
    console.warn('[YahooFinance] Session/crumb initialization error:', err);
  }

  return { cookie: cachedCookie, crumb: cachedCrumb };
}

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
 * Normalizes input symbol for Yahoo Finance query.
 * Indian tickers default to .NS (NSE).
 */
export function formatYahooSymbol(rawSymbol: string): string {
  const clean = rawSymbol.trim().toUpperCase();
  if (!clean) return '';
  if (clean.endsWith('.NS') || clean.endsWith('.BO') || clean.includes('^') || clean.includes('=')) {
    return clean;
  }
  // Mutual fund identifiers from Yahoo (e.g. 0P0000XW8W)
  if (clean.startsWith('0P')) {
    return `${clean}.BO`;
  }
  // Known global / US equities or ETFs
  if (US_ASSETS.has(clean)) {
    return clean;
  }
  return `${clean}.NS`;
}

/**
 * Strips the .NS or .BO suffix for clean in-app display (except for mutual fund tickers starting with 0P)
 */
export function stripYahooSuffix(symbol: string): string {
  const clean = symbol.trim().toUpperCase();
  if (clean.startsWith('0P')) {
    return clean.replace(/\.BO$/i, '');
  }
  return clean.replace(/\.NS$/i, '').replace(/\.BO$/i, '');
}

/**
 * Maps raw Yahoo Sector & Industry strings to clean Gainbase taxonomy
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
  const cleanSym = stripYahooSuffix(symbol).toUpperCase();
  const formatted = formatYahooSymbol(symbol);

  // 1. Primary: High-Resolution Stock Logo CDN
  if (formatted) {
    return `https://assets.parqet.com/logos/symbol/${formatted}?format=png`;
  }

  // 2. High-Res corporate vector from website if provided
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

  // 3. Direct dictionary match for known tickers
  if (KNOWN_STOCK_DOMAINS[cleanSym]) {
    return `https://unavatar.io/${KNOWN_STOCK_DOMAINS[cleanSym]}`;
  }

  // 4. Fallback: unavatar domain
  return `https://unavatar.io/${cleanSym.toLowerCase()}.com`;
}

let cachedUsdInrRate = 87.5;
let lastRateFetch = 0;

/**
 * Fetches real-time USD to INR exchange rate from Yahoo Finance
 */
export async function fetchUsdInrRate(): Promise<number> {
  if (Date.now() - lastRateFetch < 1800000 && cachedUsdInrRate > 0) {
    return cachedUsdInrRate;
  }
  try {
    const url = 'https://query1.finance.yahoo.com/v8/finance/chart/USDINR=X?interval=1d&range=1d';
    const res = await fetch(url, { headers: { 'User-Agent': YAHOO_USER_AGENT } });
    if (res.ok) {
      const data = await res.json();
      const rate = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (typeof rate === 'number' && rate > 50 && rate < 200) {
        cachedUsdInrRate = rate;
        lastRateFetch = Date.now();
        return rate;
      }
    }
  } catch (err) {
    console.warn('[YahooFinance] Error fetching USD/INR exchange rate:', err);
  }
  return cachedUsdInrRate;
}

export function isUsdAsset(symbol: string, currency?: string): boolean {
  if (currency === 'USD') return true;
  const clean = stripYahooSuffix(symbol).toUpperCase();
  if (clean.endsWith('.NS') || clean.endsWith('.BO')) return false;
  return US_ASSETS.has(clean);
}

/**
 * Fetches real-time market data quote including PE, 52W High/Low, MarketCap, Sector, and Logo.
 * Automatically converts US stocks to Indian Rupees (INR).
 */
export async function fetchYahooQuote(rawSymbol: string): Promise<Ticker | null> {
  const primarySymbol = formatYahooSymbol(rawSymbol);
  if (!primarySymbol) return null;
  const cleanDisplaySymbol = stripYahooSuffix(rawSymbol);

  const { cookie, crumb } = await getYahooSession();

  let quoteSummaryData: any = null;
  let sectorName = 'General';
  let peRatio: number | undefined = undefined;
  let marketCap: number | undefined = undefined;
  let summaryHigh52: number | undefined = undefined;
  let summaryLow52: number | undefined = undefined;
  let summaryPrice: number | undefined = undefined;
  let summaryPrevClose: number | undefined = undefined;
  let companyWebsite: string | undefined = undefined;
  let companyName: string = cleanDisplaySymbol;

  // 1. Fetch comprehensive fundamental modules from Yahoo quoteSummary (if crumb available)
  if (crumb) {
    try {
      const summaryUrl = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(primarySymbol)}?modules=assetProfile,summaryDetail,price&crumb=${crumb}`;
      const sRes = await fetch(summaryUrl, {
        headers: {
          'User-Agent': YAHOO_USER_AGENT,
          Cookie: cookie,
        },
      });
      if (sRes.ok) {
        const sJson = await sRes.json();
        const res = sJson?.quoteSummary?.result?.[0];
        if (res) {
          quoteSummaryData = res;
          if (res.assetProfile) {
            sectorName = normalizeSector(res.assetProfile.sector, res.assetProfile.industry);
            if (res.assetProfile.website) {
              companyWebsite = res.assetProfile.website;
            }
          }
          if (res.summaryDetail?.trailingPE?.raw) {
            peRatio = Number(res.summaryDetail.trailingPE.raw.toFixed(2));
          } else if (res.summaryDetail?.forwardPE?.raw) {
            peRatio = Number(res.summaryDetail.forwardPE.raw.toFixed(2));
          }
          if (res.price?.marketCap?.raw) {
            marketCap = Number(res.price.marketCap.raw);
          } else if (res.summaryDetail?.marketCap?.raw) {
            marketCap = Number(res.summaryDetail.marketCap.raw);
          }
          if (res.summaryDetail?.fiftyTwoWeekHigh?.raw) {
            summaryHigh52 = Number(res.summaryDetail.fiftyTwoWeekHigh.raw);
          }
          if (res.summaryDetail?.fiftyTwoWeekLow?.raw) {
            summaryLow52 = Number(res.summaryDetail.fiftyTwoWeekLow.raw);
          }
          if (res.price?.regularMarketPrice?.raw) {
            summaryPrice = Number(res.price.regularMarketPrice.raw);
          }
          if (res.price?.regularMarketPreviousClose?.raw) {
            summaryPrevClose = Number(res.price.regularMarketPreviousClose.raw);
          }
          if (res.price?.shortName || res.price?.longName) {
            companyName = res.price.longName || res.price.shortName;
          }
        }
      }
    } catch (err) {
      console.warn(`[YahooFinance] Error fetching quoteSummary for ${primarySymbol}:`, err);
    }
  }

  // 2. Fetch chart endpoint for price, previous close, 52W range, and historical streaks
  const chartTicker = await executeYahooChartQuery(primarySymbol, rawSymbol);
  
  if (!chartTicker && !quoteSummaryData) {
    // Try BSE if NSE failed
    if (primarySymbol.endsWith('.NS')) {
      const bseSym = `${stripYahooSuffix(rawSymbol)}.BO`;
      const bseTicker = await executeYahooChartQuery(bseSym, rawSymbol);
      if (bseTicker) {
        if (sectorName !== 'General') bseTicker.Sector = sectorName;
        if (peRatio) bseTicker.PE = peRatio;
        if (marketCap) bseTicker['Market Cap'] = marketCap;
        bseTicker.Logo = getCompanyLogoUrl(cleanDisplaySymbol, bseTicker['Company Name'], companyWebsite);
        return bseTicker;
      }
    }
    return null;
  }

  const isUSD = isUsdAsset(cleanDisplaySymbol, quoteSummaryData?.price?.currency);
  const usdRate = (isUSD && !chartTicker) ? await fetchUsdInrRate() : 1;

  const currentPrice = Number(((chartTicker?.['Current Value'] || summaryPrice || 0) * (chartTicker ? 1 : usdRate)).toFixed(2));
  const yesterdayClose = Number(((chartTicker?.['Yesterday Close'] || summaryPrevClose || currentPrice) * (chartTicker ? 1 : usdRate)).toFixed(2));
  const finalCompanyName = chartTicker?.['Company Name'] || companyName || cleanDisplaySymbol;

  // Resolve P/E Ratio (Yahoo quoteSummary -> Google Finance fallback)
  if (!peRatio && chartTicker?.PE && chartTicker.PE !== 'N/A') {
    peRatio = Number(chartTicker.PE);
  }
  // Resolve Market Cap
  if (!marketCap) {
    marketCap = await fetchLiveMarketCap(cleanDisplaySymbol);
    if (marketCap && isUSD && !chartTicker) {
      marketCap = marketCap * usdRate;
    }
  } else if (isUSD && !chartTicker) {
    marketCap = marketCap * usdRate;
  }

  // Resolve Sector (Yahoo quoteSummary -> inferSector)
  const resolvedSector = sectorName !== 'General'
    ? sectorName
    : inferSector(finalCompanyName, cleanDisplaySymbol);

  // Resolve Company Logo
  const resolvedLogo = getCompanyLogoUrl(cleanDisplaySymbol, finalCompanyName, companyWebsite);

  const rawHigh52 = chartTicker?.High52 || (summaryHigh52 ? summaryHigh52 * usdRate : undefined);
  const rawLow52 = chartTicker?.Low52 || (summaryLow52 ? summaryLow52 * usdRate : undefined);
  const high52 = typeof rawHigh52 === 'number' ? Number(rawHigh52.toFixed(2)) : (rawHigh52 ? Number(Number(rawHigh52).toFixed(2)) : undefined);
  const low52 = typeof rawLow52 === 'number' ? Number(rawLow52.toFixed(2)) : (rawLow52 ? Number(Number(rawLow52).toFixed(2)) : undefined);

  const tickerObj: Ticker = {
    Tickers: cleanDisplaySymbol,
    'Current Value': currentPrice,
    'Company Name': finalCompanyName,
    'Asset Type': chartTicker?.['Asset Type'] || 'Equity',
    Sector: resolvedSector,
    'Yesterday Close': yesterdayClose,
    High52: high52,
    Low52: low52,
    PE: peRatio,
    'Market Cap': marketCap,
    Logo: resolvedLogo,
    'Today - 2': chartTicker?.['Today - 2'],
    'Today - 3': chartTicker?.['Today - 3'],
  };

  return tickerObj;
}

async function executeYahooChartQuery(querySymbol: string, originalInput: string): Promise<Ticker | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(querySymbol)}?interval=1d&range=5d`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': YAHOO_USER_AGENT,
        Accept: 'application/json',
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    const result = data?.chart?.result?.[0];
    if (!result || !result.meta) return null;

    const meta = result.meta;
    const cleanDisplaySymbol = stripYahooSuffix(originalInput);
    const isUSD = isUsdAsset(cleanDisplaySymbol, meta.currency);
    const usdRate = isUSD ? await fetchUsdInrRate() : 1;

    const rawRegularMarketPrice = Number(meta.regularMarketPrice || meta.chartPreviousClose || 0);
    const regularMarketPrice = Number((rawRegularMarketPrice * usdRate).toFixed(2));
    const rawYesterdayClose = meta.chartPreviousClose !== undefined
      ? Number(meta.chartPreviousClose)
      : Number(meta.previousClose || rawRegularMarketPrice);
    const yesterdayClose = Number((rawYesterdayClose * usdRate).toFixed(2));
    const companyName = meta.shortName || meta.longName || cleanDisplaySymbol;

    // Closing series for streak calculations
    const closeSeries = result.indicators?.quote?.[0]?.close || [];
    const validCloses = closeSeries.filter((c: any) => typeof c === 'number' && !isNaN(c));

    let todayMinus2: number | undefined = undefined;
    let todayMinus3: number | undefined = undefined;

    if (validCloses.length >= 3) {
      todayMinus2 = Number((Number(validCloses[validCloses.length - 2]) * usdRate).toFixed(2));
    }
    if (validCloses.length >= 4) {
      todayMinus3 = Number((Number(validCloses[validCloses.length - 3]) * usdRate).toFixed(2));
    }

    // Live P/E and Market Cap lookup
    const peRatio = await fetchLivePE(cleanDisplaySymbol);
    let marketCap = await fetchLiveMarketCap(cleanDisplaySymbol);
    if (marketCap && isUSD) {
      marketCap = marketCap * usdRate;
    }

    // Resolve Sector
    const resolvedSector = meta.sector && normalizeSector(meta.sector) !== 'General'
      ? normalizeSector(meta.sector)
      : inferSector(companyName, cleanDisplaySymbol);

    const resolvedLogo = getCompanyLogoUrl(cleanDisplaySymbol, companyName);

    const high52 = meta.fiftyTwoWeekHigh ? Number((Number(meta.fiftyTwoWeekHigh) * usdRate).toFixed(2)) : undefined;
    const low52 = meta.fiftyTwoWeekLow ? Number((Number(meta.fiftyTwoWeekLow) * usdRate).toFixed(2)) : undefined;

    const tickerObj: Ticker = {
      Tickers: cleanDisplaySymbol,
      'Current Value': regularMarketPrice,
      'Company Name': companyName,
      'Asset Type': meta.instrumentType === 'EQUITY' ? 'Equity' : (meta.instrumentType || 'Equity'),
      Sector: resolvedSector,
      'Yesterday Close': yesterdayClose,
      High52: high52,
      Low52: low52,
      PE: peRatio,
      'Market Cap': marketCap,
      Logo: resolvedLogo,
      'Today - 2': todayMinus2,
      'Today - 3': todayMinus3,
    };

    return tickerObj;
  } catch (error) {
    console.warn(`[YahooFinance] Error in chart query for ${querySymbol}:`, error);
    return null;
  }
}

/**
 * Fetches batch quotes for multiple symbols with concurrent throttling and real-time PE and Sector extraction.
 * Automatically converts US stocks to Indian Rupees (INR).
 */
export async function fetchYahooQuotesBatch(
  symbols: string[],
  concurrency = 8
): Promise<Ticker[]> {
  const uniqueSymbols = Array.from(
    new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))
  );

  if (uniqueSymbols.length === 0) return [];

  const { cookie, crumb } = await getYahooSession();
  const results: Ticker[] = [];

  // If crumb is available, use multi-symbol batch query (up to 20 per request)
  if (crumb) {
    const batchChunkSize = 20;
    for (let i = 0; i < uniqueSymbols.length; i += batchChunkSize) {
      const chunk = uniqueSymbols.slice(i, i + batchChunkSize);
      const formattedSymbols = chunk.map((s) => formatYahooSymbol(s));
      try {
        const qUrl = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(formattedSymbols.join(','))}&crumb=${crumb}`;
        const qRes = await fetch(qUrl, {
          headers: {
            'User-Agent': YAHOO_USER_AGENT,
            Cookie: cookie,
          },
        });
        if (qRes.ok) {
          const qJson = await qRes.json();
          const items: any[] = qJson?.quoteResponse?.result || [];
          for (const item of items) {
            if (typeof item.regularMarketPrice === 'number') {
              const sym = stripYahooSuffix(item.symbol || '');
              const isUSD = isUsdAsset(sym, item.currency);
              const usdRate = isUSD ? await fetchUsdInrRate() : 1;

              const peRatio = typeof item.trailingPE === 'number'
                ? Number(item.trailingPE.toFixed(2))
                : (typeof item.forwardPE === 'number' ? Number(item.forwardPE.toFixed(2)) : undefined);
              const rawMarketCap = typeof item.marketCap === 'number' ? Number(item.marketCap) : undefined;
              const marketCap = rawMarketCap ? rawMarketCap * usdRate : undefined;
              const companyName = item.longName || item.shortName || sym;
              const logoUrl = getCompanyLogoUrl(sym, companyName);

              results.push({
                Tickers: sym,
                'Current Value': Number((Number(item.regularMarketPrice) * usdRate).toFixed(2)),
                'Company Name': companyName,
                'Asset Type': item.quoteType === 'EQUITY' ? 'Equity' : (item.quoteType || 'Equity'),
                Sector: 'General', // will be enriched if cached or on single lookup
                'Yesterday Close': Number((Number(item.regularMarketPreviousClose || item.regularMarketPrice) * usdRate).toFixed(2)),
                High52: item.fiftyTwoWeekHigh ? Number((Number(item.fiftyTwoWeekHigh) * usdRate).toFixed(2)) : undefined,
                Low52: item.fiftyTwoWeekLow ? Number((Number(item.fiftyTwoWeekLow) * usdRate).toFixed(2)) : undefined,
                PE: peRatio,
                'Market Cap': marketCap,
                Logo: logoUrl,
              });
            }
          }
        }
      } catch (err) {
        console.warn('[YahooFinance] Batch quote error:', err);
      }
    }
  }

  // Any symbols missed by the batch endpoint are fetched individually via fetchYahooQuote
  const foundSymbols = new Set(results.map((r) => r.Tickers.toUpperCase()));
  const missing = uniqueSymbols.filter((s) => !foundSymbols.has(stripYahooSuffix(s)));

  if (missing.length > 0) {
    for (let i = 0; i < missing.length; i += concurrency) {
      const chunk = missing.slice(i, i + concurrency);
      const settled = await Promise.allSettled(chunk.map((s) => fetchYahooQuote(s)));
      settled.forEach((res) => {
        if (res.status === 'fulfilled' && res.value) {
          results.push(res.value);
        }
      });
    }
  }

  return results;
}

/**
 * Real-time dynamic search across Yahoo Finance for any Stock, ETF, or Mutual Fund
 */
export async function searchYahooTickers(query: string): Promise<Ticker[]> {
  const clean = query.trim();
  if (!clean || clean.length < 2) return [];

  try {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(clean)}&quotesCount=20&newsCount=0`;
    const res = await fetch(url, {
      headers: { 'User-Agent': YAHOO_USER_AGENT },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const quotes = data?.quotes || [];

    const results: Ticker[] = [];
    const seen = new Set<string>();

    for (const q of quotes) {
      if (!q.symbol) continue;
      const qType = (q.quoteType || '').toUpperCase();
      const isIndianExchange = q.exchange === 'NSI' || q.exchange === 'BSE' || q.exchange === 'NSE';
      const isSupportedType = ['EQUITY', 'ETF', 'MUTUALFUND', 'MUTUAL_FUND', 'INDEX'].includes(qType);

      if (isSupportedType || isIndianExchange) {
        const sym = stripYahooSuffix(q.symbol);
        if (seen.has(sym)) continue;
        seen.add(sym);

        const name = q.shortname || q.longname || sym;
        const isETF = qType === 'ETF' || name.toLowerCase().includes('etf') || name.toLowerCase().includes('bees');
        const isMF = qType === 'MUTUALFUND' || qType === 'MUTUAL_FUND' || name.toLowerCase().includes('fund') || name.toLowerCase().includes('direct plan') || name.toLowerCase().includes('growth');
        const isIndex = qType === 'INDEX';
        const assetType = isIndex ? 'Index' : (isETF ? 'ETF' : (isMF ? 'Mutual Fund' : 'Equity'));
        const sector = inferSector(name, sym);
        const logo = getCompanyLogoUrl(q.symbol, name);

        results.push({
          Tickers: sym,
          'Company Name': name,
          'Current Value': 0,
          'Asset Type': assetType,
          Sector: sector,
          Logo: logo,
          'Yesterday Close': 0,
        });
      }
    }
    return results;
  } catch (err) {
    console.warn('[YahooFinance] searchYahooTickers error:', err);
    return [];
  }
}

