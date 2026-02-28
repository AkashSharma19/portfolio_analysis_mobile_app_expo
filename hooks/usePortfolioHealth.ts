import { usePortfolioStore } from '@/store/usePortfolioStore';
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

        // ── 1. CONCENTRATION RISK (25 pts) ────────────────────────────────
        const maxConcentration = Math.max(...holdings.map((h) => h.contributionPercentage));
        let concentrationScore = 0;
        let concentrationDesc = '';
        if (maxConcentration < 15) {
            concentrationScore = 25;
            concentrationDesc = 'No single stock dominates. Well spread.';
        } else if (maxConcentration < 25) {
            concentrationScore = 18;
            concentrationDesc = `Largest position is ${maxConcentration.toFixed(0)}%. Acceptable.`;
        } else if (maxConcentration < 40) {
            concentrationScore = 10;
            concentrationDesc = `${maxConcentration.toFixed(0)}% in one stock. Consider trimming.`;
        } else {
            concentrationScore = 3;
            concentrationDesc = `${maxConcentration.toFixed(0)}% in one stock. High risk.`;
        }

        // ── 2. DIVERSIFICATION (25 pts) ───────────────────────────────────
        const holdingCount = holdings.length;
        const sectorCount = new Set(holdings.map((h) => h.sector || 'Other')).size;

        let holdingPts = 0;
        if (holdingCount >= 15) holdingPts = 15;
        else if (holdingCount >= 8) holdingPts = 12;
        else if (holdingCount >= 4) holdingPts = 8;
        else holdingPts = 3;

        let sectorPts = 0;
        if (sectorCount >= 5) sectorPts = 10;
        else if (sectorCount >= 3) sectorPts = 7;
        else if (sectorCount >= 2) sectorPts = 4;
        else sectorPts = 1;

        const diversificationScore = Math.min(25, holdingPts + sectorPts);
        const diversificationDesc = `${holdingCount} stocks across ${sectorCount} sector${sectorCount !== 1 ? 's' : ''}.`;

        // ── 3. PROFITABILITY (25 pts) ─────────────────────────────────────
        const pnlPct = summary.profitPercentage;
        let profitabilityScore = 0;
        let profitabilityDesc = '';
        if (pnlPct >= 30) {
            profitabilityScore = 25;
            profitabilityDesc = `Outstanding ${pnlPct.toFixed(1)}% overall return.`;
        } else if (pnlPct >= 15) {
            profitabilityScore = 20;
            profitabilityDesc = `Strong ${pnlPct.toFixed(1)}% overall return.`;
        } else if (pnlPct >= 5) {
            profitabilityScore = 14;
            profitabilityDesc = `Decent ${pnlPct.toFixed(1)}% overall return.`;
        } else if (pnlPct >= 0) {
            profitabilityScore = 8;
            profitabilityDesc = `Slightly positive at ${pnlPct.toFixed(1)}%.`;
        } else {
            profitabilityScore = 2;
            profitabilityDesc = `Portfolio is ${pnlPct.toFixed(1)}% in the red.`;
        }

        // ── 4. XIRR QUALITY (25 pts) ──────────────────────────────────────
        const xirr = summary.xirr;
        let xirrScore = 0;
        let xirrDesc = '';
        if (xirr >= 20) {
            xirrScore = 25;
            xirrDesc = `Exceptional XIRR of ${xirr.toFixed(1)}%.`;
        } else if (xirr >= 12) {
            xirrScore = 20;
            xirrDesc = `Great XIRR of ${xirr.toFixed(1)}%, beating most benchmarks.`;
        } else if (xirr >= 8) {
            xirrScore = 14;
            xirrDesc = `Solid XIRR of ${xirr.toFixed(1)}%.`;
        } else if (xirr >= 0) {
            xirrScore = 7;
            xirrDesc = `Low XIRR of ${xirr.toFixed(1)}%. Room to improve.`;
        } else {
            xirrScore = 1;
            xirrDesc = `Negative XIRR of ${xirr.toFixed(1)}%.`;
        }

        const totalScore = concentrationScore + diversificationScore + profitabilityScore + xirrScore;

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
                { label: 'Concentration', score: concentrationScore, maxScore: 25, description: concentrationDesc },
                { label: 'Diversification', score: diversificationScore, maxScore: 25, description: diversificationDesc },
                { label: 'Profitability', score: profitabilityScore, maxScore: 25, description: profitabilityDesc },
                { label: 'XIRR Quality', score: xirrScore, maxScore: 25, description: xirrDesc },
            ],
        };
    }, [holdings, summary]);
};
