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
      const days =
        (cf.date.getTime() - cashFlows[0].date.getTime()) /
        (1000 * 60 * 60 * 24);
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

export function calculateProjection(
  currentVal: number,
  annualReturn: number,
  monthlySIP: number,
  years: number,
  stepUpPercent: number = 0,
  inflationRate: number = 0.06,
  isInflationAdjusted: boolean = false,
) {
  let totalFutureValue = currentVal;
  let totalInvested = currentVal;
  let currentMonthlySIP = monthlySIP;

  const inflationFactor = isInflationAdjusted ? 1 + inflationRate : 1;

  for (let year = 1; year <= years; year++) {
    // Apply returns and SIP for 12 months
    for (let month = 1; month <= 12; month++) {
      totalFutureValue = totalFutureValue * Math.pow(1 + annualReturn, 1 / 12) + currentMonthlySIP;
      totalInvested += currentMonthlySIP;
    }
    // Apply step-up at the end of each year
    currentMonthlySIP = currentMonthlySIP * (1 + stepUpPercent / 100);
  }

  const estimatedGains = totalFutureValue - totalInvested;
  const multiplier = totalFutureValue / totalInvested;
  
  // If not already adjusted in the loop, we can do it at the end for simple "current value today"
  const presentValue = totalFutureValue / Math.pow(1 + inflationRate, years);

  // If inflation adjusted mode is ON, we return the discounted future value as the primary value
  const displayValue = isInflationAdjusted ? presentValue : totalFutureValue;

  return {
    totalFutureValue: displayValue,
    totalInvested,
    estimatedGains: isInflationAdjusted ? presentValue - totalInvested : estimatedGains,
    multiplier: isInflationAdjusted ? presentValue / totalInvested : multiplier,
    presentValue,
  };
}

export function calculateProjectionSeries(
  currentVal: number,
  annualReturn: number,
  monthlySIP: number,
  years: number,
  stepUpPercent: number = 0,
  inflationRate: number = 0.06,
  isInflationAdjusted: boolean = false,
) {
  const dataPoints = [];
  let totalFutureValue = currentVal;
  let currentMonthlySIP = monthlySIP;
  let totalInvested = currentVal;

  dataPoints.push({
    year: 0,
    value: currentVal,
    label: 'Now',
    totalInvested: currentVal,
    estimatedGains: 0,
    multiplier: 1,
  });

  for (let year = 1; year <= years; year++) {
    for (let month = 1; month <= 12; month++) {
      totalFutureValue = totalFutureValue * Math.pow(1 + annualReturn, 1 / 12) + currentMonthlySIP;
      totalInvested += currentMonthlySIP;
    }
    
    // Apply step-up for NEXT year
    currentMonthlySIP = currentMonthlySIP * (1 + stepUpPercent / 100);

    const valToPush = isInflationAdjusted 
      ? totalFutureValue / Math.pow(1 + inflationRate, year)
      : totalFutureValue;

    dataPoints.push({
      year,
      value: valToPush,
      label: `+${year}y`,
      totalInvested,
      estimatedGains: valToPush - totalInvested,
      multiplier: valToPush / totalInvested,
    });
  }
  return dataPoints;
}

export function formatIndianNumber(num: number | string | undefined | null): string {
  if (num === null || num === undefined) return 'N/A';
  const val = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : num;
  if (isNaN(val)) return String(num);

  if (val >= 10000000) {
    return (val / 10000000).toFixed(2) + ' Cr';
  } else if (val >= 100000) {
    return (val / 100000).toFixed(2) + ' L';
  } else if (val >= 1000) {
    return (val / 1000).toFixed(2) + ' K';
  }
  return val.toFixed(2);
}
