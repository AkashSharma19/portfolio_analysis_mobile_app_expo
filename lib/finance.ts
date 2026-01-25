/**
 * XIRR (Extended Internal Rate of Return) calculation using Newton-Raphson method.
 */

interface CashFlow {
    amount: number;
    date: Date;
}

export function calculateXIRR(cashFlows: CashFlow[]): number {
    if (cashFlows.length < 2) return 0;

    // xIRR Equation: sum (Ci / (1 + r)^((di - d0) / 365)) = 0

    const maxIterations = 100;
    const precision = 1e-6;
    let rate = 0.1; // Initial guess 10%

    for (let i = 0; i < maxIterations; i++) {
        let f = 0;
        let df = 0;

        for (const cf of cashFlows) {
            const days = (cf.date.getTime() - cashFlows[0].date.getTime()) / (1000 * 60 * 60 * 24);
            const fraction = days / 365;
            const term = Math.pow(1 + rate, fraction);

            f += cf.amount / term;
            df -= (cf.amount * fraction) / (term * (1 + rate));
        }

        const nextRate = rate - f / df;
        if (Math.abs(nextRate - rate) < precision) return nextRate * 100;
        rate = nextRate;
    }

    return rate * 100;
}
