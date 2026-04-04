import { usePortfolioStore } from '@/store/usePortfolioStore';
import { Ticker } from '../types';
import { useMemo } from 'react';

export interface HealthDimension {
    label: string;
    score: number;     // 0–25
    maxScore: number;  // always 25
    description: string;
}

export interface PortfolioHealth {
    totalScore: number;         // 0–100
    grade: 'Excellent' | 'Good' | 'Fair' | 'Poor';
    gradeColor: string;
    dimensions: HealthDimension[];
    isEmpty: boolean;
}

export const usePortfolioHealth = (): PortfolioHealth => {
    const getHoldingsData = usePortfolioStore((s) => s.getHoldingsData);
    const calculateSummary = usePortfolioStore((s) => s.calculateSummary);
    const transactions = usePortfolioStore((s) => s.transactions);
    const tickers = usePortfolioStore((s) => s.tickers);

    const holdings = useMemo(() => getHoldingsData(), [getHoldingsData, transactions, tickers]);
    const summary = useMemo(() => calculateSummary(), [calculateSummary, transactions, tickers]);

    return useMemo(() => {
        const empty: PortfolioHealth = {
            totalScore: 0,
            grade: 'Poor',
            gradeColor: '#FF3B30',
            dimensions: [],
            isEmpty: true,
        };

        if (holdings.length === 0) return empty;

        // ── 1. DIVERSITY & ASSET MIX (25 pts) ───────────────────────────
        const sectorCount = new Set(holdings.map((h) => h.sector || 'Other')).size;
        const assetTypes = new Set(holdings.map((h) => h.assetType || 'Other')).size;
        const stockCount = holdings.length;

        let sectorPts = sectorCount >= 6 ? 8 : sectorCount >= 4 ? 6 : sectorCount >= 2 ? 3 : 1;
        let assetTypePts = assetTypes >= 4 ? 8 : assetTypes >= 3 ? 6 : assetTypes >= 2 ? 3 : 1;
        let stockPts = stockCount >= 12 ? 9 : stockCount >= 8 ? 7 : stockCount >= 4 ? 4 : 1;

        const diversityScore = sectorPts + assetTypePts + stockPts;
        const diversityDesc = `${stockCount} stocks in ${sectorCount} sectors and ${assetTypes} asset types.`;

        // ── 2. CONCENTRATION RISK (20 pts) ──────────────────────────────
        const sortedByContrib = [...holdings].sort((a, b) => b.contributionPercentage - a.contributionPercentage);
        const maxSingle = sortedByContrib[0]?.contributionPercentage || 0;
        const top3Sum = sortedByContrib.slice(0, 3).reduce((acc, h) => acc + h.contributionPercentage, 0);

        let singlePts = maxSingle < 15 ? 12 : maxSingle < 25 ? 8 : maxSingle < 40 ? 4 : 1;
        let top3Pts = top3Sum < 40 ? 8 : top3Sum < 60 ? 5 : top3Sum < 80 ? 2 : 0;

        const concentrationScore = singlePts + top3Pts;
        const concentrationDesc = `Top 3 holdings are ${top3Sum.toFixed(0)}% of portfolio.`;

        // ── 3. PERFORMANCE QUALITY (20 pts) ────────────────────────────
        const xirr = summary.xirr;
        const winRatio = (holdings.filter(h => h.pnl > 0).length / holdings.length) * 100;

        let xirrPts = xirr >= 18 ? 12 : xirr >= 12 ? 9 : xirr >= 8 ? 6 : xirr >= 0 ? 3 : 0;
        let winPts = winRatio >= 80 ? 8 : winRatio >= 60 ? 6 : winRatio >= 40 ? 4 : winRatio >= 20 ? 2 : 0;

        const performanceScore = xirrPts + winPts;
        const performanceDesc = `Win ratio: ${winRatio.toFixed(0)}%. XIRR: ${xirr.toFixed(1)}%.`;

        // ── 4. RISK & VOLATILITY (20 pts) ───────────────────────────────
        // Calculate 7-Day Portfolio Volatility
        const portfolioReturns: number[] = [];
        const tickerMap = new Map(tickers.map(t => [t.Tickers.trim().toUpperCase(), t]));

        // We have Today, Yesterday, Today-2...Today-7. Total 8 points = 7 daily return steps.
        for (let i = 0; i < 7; i++) {
            let dayValue = 0;
            let prevDayValue = 0;

            holdings.forEach(h => {
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

        const avgReturn = portfolioReturns.length > 0 ? portfolioReturns.reduce((a, b) => a + b, 0) / portfolioReturns.length : 0;
        const variance = portfolioReturns.length > 0 ? portfolioReturns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / portfolioReturns.length : 0;
        const stdDev = Math.sqrt(variance) * 100; // in %

        let stabilityPts = stdDev < 1.0 ? 12 : stdDev < 2.0 ? 8 : stdDev < 3.5 ? 4 : 1;

        // 52W Range Positioning
        const avgPos = holdings.reduce((acc, h) => {
            if (h.high52 && h.low52 && h.high52 > h.low52) {
                const pos = (h.currentPrice - h.low52) / (h.high52 - h.low52);
                return acc + pos;
            }
            return acc + 0.5; // Neutral default
        }, 0) / holdings.length;

        let positioningPts = avgPos < 0.3 ? 8 : avgPos < 0.6 ? 5 : avgPos < 0.8 ? 2 : 0;

        const riskScore = stabilityPts + positioningPts;
        const riskDesc = `7-day volatility is ${stdDev.toFixed(2)}%. Stability is ${stdDev < 2 ? 'Good' : 'Moderate'}.`;

        // ── 5. PROFITABILITY (15 pts) ───────────────────────────────────
        const pnlPct = summary.profitPercentage;
        let profitabilityScore = pnlPct >= 25 ? 15 : pnlPct >= 15 ? 12 : pnlPct >= 5 ? 8 : pnlPct >= 0 ? 4 : 1;
        const profitabilityDesc = `Total gains of ${pnlPct.toFixed(1)}%.`;

        const totalScore = Math.min(100, diversityScore + concentrationScore + performanceScore + riskScore + profitabilityScore);

        let grade: PortfolioHealth['grade'];
        let gradeColor: string;
        if (totalScore >= 80) { grade = 'Excellent'; gradeColor = '#34C759'; }
        else if (totalScore >= 60) { grade = 'Good'; gradeColor = '#5AC8FA'; }
        else if (totalScore >= 40) { grade = 'Fair'; gradeColor = '#FF9500'; }
        else { grade = 'Poor'; gradeColor = '#FF3B30'; }

        return {
            totalScore,
            grade,
            gradeColor,
            isEmpty: false,
            dimensions: [
                { label: 'Diversity & Asset Mix', score: diversityScore, maxScore: 25, description: diversityDesc },
                { label: 'Concentration Risk', score: concentrationScore, maxScore: 20, description: concentrationDesc },
                { label: 'Performance Quality', score: performanceScore, maxScore: 20, description: performanceDesc },
                { label: 'Short-term Stability', score: Math.round(riskScore), maxScore: 20, description: riskDesc },
                { label: 'Absolute Profit', score: profitabilityScore, maxScore: 15, description: profitabilityDesc },
            ],
        };
    }, [holdings, summary, tickers]);
};
