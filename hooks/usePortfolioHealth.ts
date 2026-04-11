import { usePortfolioStore } from '@/store/usePortfolioStore';
import { Ticker } from '../types';
import { useMemo } from 'react';

export interface HealthMetric {
  label: string;
  value: string | number;
  status: 'good' | 'neutral' | 'error' | 'warning';
}

export interface HealthDimension {
  label: string;
  score: number;
  maxScore: number;
  description: string;
  insights: string;
  recommendations: string[];
  metrics: HealthMetric[];
}

export interface PortfolioHealth {
  totalScore: number; // 0–100
  grade: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  gradeColor: string;
  dimensions: HealthDimension[];
  summary: string;
  isEmpty: boolean;
}

export const usePortfolioHealth = (): PortfolioHealth => {
  const getHoldingsData = usePortfolioStore((s) => s.getHoldingsData);
  const calculateSummary = usePortfolioStore((s) => s.calculateSummary);
  const transactions = usePortfolioStore((s) => s.transactions);
  const tickers = usePortfolioStore((s) => s.tickers);

  const holdings = useMemo(
    () => getHoldingsData(),
    [getHoldingsData, transactions, tickers],
  );
  const summary = useMemo(
    () => calculateSummary(),
    [calculateSummary, transactions, tickers],
  );

  return useMemo(() => {
    const empty: PortfolioHealth = {
      totalScore: 0,
      grade: 'Poor',
      gradeColor: '#FF3B30',
      dimensions: [],
      summary: 'Add transactions to see your portfolio health analysis.',
      isEmpty: true,
    };

    if (holdings.length === 0) return empty;

    // ── 1. DIVERSITY & ASSET MIX (25 pts) ───────────────────────────
    const sectors = Array.from(new Set(holdings.map((h) => h.sector || 'Other')));
    const sectorCount = sectors.length;
    const assetTypes = Array.from(
      new Set(holdings.map((h) => h.assetType || 'Other')),
    );
    const assetTypeCount = assetTypes.length;
    const stockCount = holdings.length;

    const sectorPts =
      sectorCount >= 6 ? 8 : sectorCount >= 4 ? 6 : sectorCount >= 2 ? 3 : 1;
    const assetTypePts =
      assetTypeCount >= 4
        ? 8
        : assetTypeCount >= 3
          ? 6
          : assetTypeCount >= 2
            ? 3
            : 1;
    const stockPts =
      stockCount >= 12 ? 9 : stockCount >= 8 ? 7 : stockCount >= 4 ? 4 : 1;

    const diversityScore = sectorPts + assetTypePts + stockPts;

    const diversityMetrics: HealthMetric[] = [
      {
        label: 'Sectors',
        value: sectorCount,
        status: sectorCount >= 5 ? 'good' : 'warning',
      },
      {
        label: 'Asset Types',
        value: assetTypeCount,
        status: assetTypeCount >= 3 ? 'good' : 'warning',
      },
      {
        label: 'Total Stocks',
        value: stockCount,
        status: stockCount >= 10 ? 'good' : 'neutral',
      },
    ];

    const diversityRecommendations: string[] = [];
    if (sectorCount < 5)
      diversityRecommendations.push(
        'Add stocks from different sectors to reduce industry-specific risk.',
      );
    if (assetTypeCount < 3)
      diversityRecommendations.push(
        'Explore other asset classes like ETFs, Gold, or Bonds.',
      );
    if (stockCount < 8)
      diversityRecommendations.push(
        'Consider adding 3-4 more high-quality stocks to improve diversification.',
      );

    const diversityDimension: HealthDimension = {
      label: 'Diversity & Asset Mix',
      score: diversityScore,
      maxScore: 25,
      description: `${stockCount} stocks across ${sectorCount} sectors.`,
      insights: `Your portfolio is spread across ${sectorCount} sectors and ${assetTypeCount} asset types. ${sectorCount > 6 ? 'Highly diversified.' : 'Moderately diversified.'}`,
      recommendations: diversityRecommendations,
      metrics: diversityMetrics,
    };

    // ── 2. CONCENTRATION RISK (20 pts) ──────────────────────────────
    const sortedByContrib = [...holdings].sort(
      (a, b) =>
        (b.contributionPercentage ?? 0) - (a.contributionPercentage ?? 0),
    );
    const maxSingle = sortedByContrib[0]?.contributionPercentage || 0;
    const maxSingleSym = sortedByContrib[0]?.symbol || '';
    const top3Sum = sortedByContrib
      .slice(0, 3)
      .reduce((acc, h) => acc + (h.contributionPercentage ?? 0), 0);

    const singlePts =
      maxSingle < 15 ? 12 : maxSingle < 25 ? 8 : maxSingle < 40 ? 4 : 1;
    const top3Pts = top3Sum < 40 ? 8 : top3Sum < 60 ? 5 : top3Sum < 80 ? 2 : 0;

    const concentrationScore = singlePts + top3Pts;

    const concentrationMetrics: HealthMetric[] = [
      {
        label: 'Top Holding',
        value: `${maxSingle.toFixed(1)}%`,
        status: maxSingle < 15 ? 'good' : maxSingle < 25 ? 'warning' : 'error',
      },
      {
        label: 'Top 3 Total',
        value: `${top3Sum.toFixed(1)}%`,
        status: top3Sum < 45 ? 'good' : top3Sum < 65 ? 'warning' : 'error',
      },
    ];

    const concentrationRecs: string[] = [];
    if (maxSingle > 20)
      concentrationRecs.push(
        `Your position in ${maxSingleSym} is quite large (${maxSingle.toFixed(1)}%). Consider trimming it.`,
      );
    if (top3Sum > 60)
      concentrationRecs.push(
        'Top 3 stocks occupy more than 60% of your portfolio, creating high concentration risk.',
      );

    const concentrationDimension: HealthDimension = {
      label: 'Concentration Risk',
      score: concentrationScore,
      maxScore: 20,
      description: `Largest holding is ${maxSingle.toFixed(1)}% of total.`,
      insights: `The top 3 holdings account for ${top3Sum.toFixed(1)}% of your capital. High concentration can lead to volatile swings.`,
      recommendations: concentrationRecs,
      metrics: concentrationMetrics,
    };

    // ── RISK & VOLATILITY BASE CALCULATIONS ─────────────────────────
    const portfolioReturns: number[] = [];
    const tickerMap = new Map(
      tickers.map((t) => [t.Tickers.trim().toUpperCase(), t]),
    );

    for (let i = 0; i < 7; i++) {
      let dayValue = 0;
      let prevDayValue = 0;
      holdings.forEach((h) => {
        const t = tickerMap.get(h.symbol.trim().toUpperCase());
        if (!t) return;
        const getPrice = (dayIndex: number) => {
          if (dayIndex === 0) return t['Current Value'];
          if (dayIndex === 1) return t['Yesterday Close'] ?? t['Current Value'];
          const key = `Today - ${dayIndex}`;
          return (t as any)[key] ?? t['Yesterday Close'] ?? t['Current Value'];
        };
        const pToday = getPrice(i);
        const pPrev = getPrice(i + 1);
        dayValue += h.quantity * pToday;
        prevDayValue += h.quantity * pPrev;
      });
      if (prevDayValue > 0) {
        portfolioReturns.push((dayValue - prevDayValue) / prevDayValue);
      }
    }

    const avgReturn =
      portfolioReturns.length > 0
        ? portfolioReturns.reduce((a, b) => a + b, 0) / portfolioReturns.length
        : 0;
    const variance =
      portfolioReturns.length > 0
        ? portfolioReturns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) /
          portfolioReturns.length
        : 0;
    const stdDev = Math.sqrt(variance) * 100; // in %
    const annualizedVol = stdDev * Math.sqrt(252);

    // ── 3. PERFORMANCE QUALITY (20 pts) ────────────────────────────
    const xirr = summary.xirr;
    const winRatio =
      (holdings.filter((h) => h.pnl > 0).length / holdings.length) * 100;

    // Sharpe Ratio Calculation
    const riskFreeRate = 6.5; // Annualized RF rate
    const excessReturn = xirr - riskFreeRate;
    const sharpeRatio = annualizedVol > 0 ? excessReturn / annualizedVol : 0;

    const xirrPts =
      xirr >= 18 ? 12 : xirr >= 12 ? 9 : xirr >= 8 ? 6 : xirr >= 0 ? 3 : 0;
    const winPts =
      winRatio >= 80
        ? 8
        : winRatio >= 60
          ? 6
          : winRatio >= 40
            ? 4
            : winRatio >= 20
              ? 2
              : 0;

    const performanceScore = xirrPts + winPts;

    const performanceMetrics: HealthMetric[] = [
      {
        label: 'XIRR (Annualized)',
        value: `${xirr.toFixed(1)}%`,
        status: xirr >= 12 ? 'good' : xirr >= 0 ? 'neutral' : 'error',
      },
      {
        label: 'Win Ratio',
        value: `${winRatio.toFixed(0)}%`,
        status: winRatio >= 60 ? 'good' : winRatio >= 40 ? 'neutral' : 'warning',
      },
      {
        label: 'Sharpe Ratio',
        value: sharpeRatio.toFixed(2),
        status: sharpeRatio >= 1.5 ? 'good' : sharpeRatio >= 0.8 ? 'neutral' : 'warning',
      },
    ];

    const performanceRecs: string[] = [];
    if (xirr < 10)
      performanceRecs.push(
        'Your annualized return is below the historical index average of 12%. Review your underperformers.',
      );
    if (winRatio < 50)
      performanceRecs.push(
        'More than half of your stocks are currently in loss. Check if the investment thesis still holds.',
      );
    if (sharpeRatio < 0.5 && xirr > 0)
      performanceRecs.push(
        'Low Sharpe Ratio detected. You are taking high volatility for the returns you get. Consider adding stable large caps.',
      );

    const performanceDimension: HealthDimension = {
      label: 'Performance Quality',
      score: performanceScore,
      maxScore: 20,
      description: `Sharpe Ratio: ${sharpeRatio.toFixed(2)}. Win ratio: ${winRatio.toFixed(0)}%.`,
      insights: `Your Sharpe Ratio of ${sharpeRatio.toFixed(2)} measures your risk-adjusted return. ${sharpeRatio > 1.5 ? 'Excellent efficiency.' : sharpeRatio > 0.8 ? 'Fair efficiency.' : 'Low efficiency relative to risk.'}`,
      recommendations: performanceRecs,
      metrics: performanceMetrics,
    };

    // ── 4. RISK & STABILITY (20 pts) ───────────────────────────────
    const stabilityPts =
      stdDev < 1.0 ? 12 : stdDev < 2.0 ? 8 : stdDev < 3.5 ? 4 : 1;

    // 52W Range Positioning
    const avgPos =
      holdings.reduce((acc, h) => {
        if (h.high52 && h.low52 && h.high52 > h.low52) {
          const pos = (h.currentPrice - h.low52) / (h.high52 - h.low52);
          return acc + pos;
        }
        return acc + 0.5;
      }, 0) / holdings.length;

    const positioningPts =
      avgPos < 0.3 ? 8 : avgPos < 0.6 ? 5 : avgPos < 0.8 ? 2 : 0;

    const riskScore = stabilityPts + positioningPts;

    const riskMetrics: HealthMetric[] = [
      {
        label: 'Weekly Volatility',
        value: `${stdDev.toFixed(2)}%`,
        status:
          stdDev < 1.5 ? 'good' : stdDev < 2.5 ? 'neutral' : 'warning',
      },
      {
        label: 'Annualized Vol.',
        value: `${annualizedVol.toFixed(1)}%`,
        status: annualizedVol < 20 ? 'good' : annualizedVol < 35 ? 'neutral' : 'warning',
      },
      {
        label: '52W Position',
        value: `${(avgPos * 100).toFixed(0)}%`,
        status: avgPos < 0.4 ? 'good' : avgPos < 0.7 ? 'neutral' : 'warning',
      },
    ];

    const riskRecs: string[] = [];
    if (stdDev > 2.5)
      riskRecs.push(
        'Portfolio shows high daily fluctuations. Rebalance towards defensive sectors or large caps.',
      );
    if (avgPos > 0.8)
      riskRecs.push(
        'On average, your stocks are near their 52-week highs. Be cautious about fresh entries.',
      );

    const riskDimension: HealthDimension = {
      label: 'Short-term Stability',
      score: Math.round(riskScore),
      maxScore: 20,
      description: `7-day volatility: ${stdDev.toFixed(2)}%.`,
      insights: `A volatility of ${stdDev.toFixed(2)}% means your portfolio usually moves within this range daily. Lower is more stable.`,
      recommendations: riskRecs,
      metrics: riskMetrics,
    };

    // ── 5. PROFITABILITY (15 pts) ───────────────────────────────────
    const pnlPct = summary.profitPercentage;
    const profitabilityScore =
      pnlPct >= 20
        ? 15
        : pnlPct >= 10
          ? 12
          : pnlPct >= 5
            ? 8
            : pnlPct >= 0
              ? 4
              : 1;

    const profitMetrics: HealthMetric[] = [
      {
        label: 'Total Gain',
        value: `${pnlPct.toFixed(1)}%`,
        status: pnlPct >= 15 ? 'good' : pnlPct >= 5 ? 'neutral' : 'warning',
      },
    ];

    const profitDimension: HealthDimension = {
      label: 'Absolute Profit',
      score: profitabilityScore,
      maxScore: 15,
      description: `Total gains of ${pnlPct.toFixed(1)}%.`,
      insights: `You have achieved a total return of ${pnlPct.toFixed(1)}% on your net investment so far.`,
      recommendations:
        pnlPct < 0
          ? [
              'Evaluate your biggest losers and check if their investment thesis is still valid.',
            ]
          : [],
      metrics: profitMetrics,
    };

    const totalScore = Math.min(
      100,
      diversityScore +
        concentrationScore +
        performanceScore +
        riskScore +
        profitabilityScore,
    );

    let grade: PortfolioHealth['grade'];
    let gradeColor: string;
    let summaryText: string;

    if (totalScore >= 80) {
      grade = 'Excellent';
      gradeColor = '#34C759';
      summaryText =
        'Your portfolio is very well-structured with good diversification and solid performance.';
    } else if (totalScore >= 60) {
      grade = 'Good';
      gradeColor = '#5AC8FA';
      summaryText =
        'A healthy portfolio overall, but there is room to optimize concentration and diversification.';
    } else if (totalScore >= 40) {
      grade = 'Fair';
      gradeColor = '#FF9500';
      summaryText =
        'Moderate health. High concentration or poor diversification may be increasing your risk.';
    } else {
      grade = 'Poor';
      gradeColor = '#FF3B30';
      summaryText =
        'Action required. Your portfolio structure needs significant changes to lower risk and improve returns.';
    }

    return {
      totalScore: Math.round(totalScore),
      grade,
      gradeColor,
      isEmpty: false,
      summary: summaryText,
      dimensions: [
        diversityDimension,
        concentrationDimension,
        performanceDimension,
        riskDimension,
        profitDimension,
      ],
    };
  }, [holdings, summary, tickers]);
};
