/**
 * XIRR (Extended Internal Rate of Return) calculation using Newton-Raphson method.
 */

interface CashFlow {
    amount: number;
    date: Date;
}

export function calculateXIRR(cashFlows: CashFlow[]): number {
    // ... logic remains same
    if (cashFlows.length < 2) return 0;
    const maxIterations = 100;
    const precision = 1e-6;
    let rate = 0.1;
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

export function calculateProjection(currentVal: number, annualReturn: number, monthlySIP: number, years: number) {
    const r = annualReturn / 12;
    const n = years * 12;

    // Compound interest for current principal + future value of an annuity (SIP)
    const principalFutureValue = currentVal * Math.pow(1 + r, n);
    const sipFutureValue = monthlySIP > 0
        ? monthlySIP * (Math.pow(1 + r, n) - 1) / r
        : 0;

    const totalFutureValue = principalFutureValue + sipFutureValue;
    const totalInvested = currentVal + (monthlySIP * n);
    const estimatedGains = totalFutureValue - totalInvested;
    const multiplier = totalFutureValue / totalInvested;

    // Inflation adjustment (standard 6%)
    const inflationRate = 0.06;
    const presentValue = totalFutureValue / Math.pow(1 + inflationRate, years);

    return {
        totalFutureValue,
        totalInvested,
        estimatedGains,
        multiplier,
        presentValue
    };
}
