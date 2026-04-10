import { Shield, Scale, LayoutGrid } from 'lucide-react-native';
import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { Svg, Circle } from 'react-native-svg';

const { width } = Dimensions.get('window');

interface ShareableCardProps {
  data: {
    totalValue: number;
    profitAmount: number;
    profitPercentage: number;
    dayChange: number;
    dayChangePercentage: number;
    xirr: number;
    healthScore?: number;
    topWinners: {
      symbol: string;
      profit: number;
    }[];
    userName?: string;
    holdingsCount?: number;
    winRate?: number;
  };
}

// ✨ Ultra-Minimal Circular Metrics
const MiniMetric = ({
  score,
  color,
  label,
  icon: Icon,
  isPercent = false,
}: any) => {
  const size = 32;
  const r = size * 0.4;
  const center = size / 2;
  const circum = 2 * Math.PI * r;
  const offset = circum - (score / 100) * circum;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View
        style={{
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Svg width={size} height={size}>
          <Circle
            cx={center}
            cy={center}
            r={r}
            stroke="#2C2C2E"
            strokeWidth={2.5}
            fill="none"
          />
          <Circle
            cx={center}
            cy={center}
            r={r}
            stroke={color}
            strokeWidth={2.5}
            strokeDasharray={`${circum} ${circum}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            fill="none"
            transform={`rotate(-90 ${center} ${center})`}
          />
        </Svg>
      </View>
      <View>
        <ThemedText style={{ color: '#FFF', fontSize: 13, fontWeight: '600' }}>
          {score.toFixed(0)}
          {isPercent ? '%' : ''}
        </ThemedText>
        <ThemedText
          style={{
            color: '#8E8E93',
            fontSize: 7,
            fontWeight: '700',
            letterSpacing: 0.5,
          }}
        >
          {label}
        </ThemedText>
      </View>
    </View>
  );
};

const getPersonaName = (stats: {
  risk: number;
  diversification: number;
  winRate: number;
}) => {
  if (stats.winRate > 80) return 'The Alpha Hunter';
  if (stats.diversification > 80) return 'The Strategic Guardian';
  if (stats.risk > 70) return 'The Adrenaline Trader';
  if (stats.diversification > 60 && stats.risk < 40)
    return 'The Balanced Architect';
  return 'The Aspiring Tycoon';
};

export default function ShareableCard({ data }: ShareableCardProps) {
  const isProfit = data.profitAmount >= 0;
  const isDayProfit = data.dayChange >= 0;

  const persona = getPersonaName({
    risk: Math.min(Math.abs(data.dayChangePercentage) * 20, 100),
    diversification: Math.min((data.holdingsCount || 5) * 5, 100),
    winRate: data.winRate || 50,
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <View style={styles.captureContainer}>
      <View style={styles.minimalCard}>
        {/* Minimal Header */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <LayoutGrid size={14} color="#0A84FF" />
            <ThemedText style={styles.brandTitle}>GAINBASE</ThemedText>
          </View>
          <ThemedText style={styles.dateText}>
            {new Date()
              .toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })
              .toUpperCase()}
          </ThemedText>
        </View>

        {/* Typography Hero */}
        <View style={styles.heroSection}>
          <ThemedText style={styles.heroValue}>
            {formatCurrency(data.totalValue)}
          </ThemedText>
          <View style={styles.subMetricRow}>
            <ThemedText
              style={[
                styles.subValue,
                { color: isProfit ? '#34C759' : '#FF3B30' },
              ]}
            >
              {isProfit ? '+' : ''}
              {data.profitPercentage.toFixed(2)}% Total
            </ThemedText>
            <View style={styles.dot} />
            <ThemedText style={styles.subValue}>{data.xirr.toFixed(1)}% XIRR</ThemedText>
            <View style={styles.dot} />
            <ThemedText
              style={[
                styles.subValue,
                { color: isDayProfit ? '#34C759' : '#FF3B30' },
              ]}
            >
              {isDayProfit ? '+' : ''}
              {data.dayChangePercentage.toFixed(1)}% Day
            </ThemedText>
          </View>
        </View>

        {/* Bottom Stats Line */}
        <View style={styles.bottomSection}>
          <View style={styles.statLine}>
            <MiniMetric
              score={data.healthScore || 85}
              color="#0A84FF"
              label="HEALTH"
              icon={Shield}
            />
            <View style={styles.verticalDivider} />
            <MiniMetric
              score={data.winRate || 72}
              color="#34C759"
              label="WIN RATE"
              icon={Scale}
              isPercent
            />
          </View>

          <View style={styles.personaRow}>
            <ThemedText style={styles.personaLabel}>INVESTOR DNA</ThemedText>
            <ThemedText style={styles.personaValue}>{persona.toUpperCase()}</ThemedText>
          </View>
        </View>

        {/* Clean Footer Branding */}
        <View style={styles.footerBranding}>
          <ThemedText style={styles.footerText}>
            PROUDLY INVESTING WITH GAINBASE.APP
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  captureContainer: {
    width: width,
    aspectRatio: 0.85,
    backgroundColor: '#000',
    padding: 32,
    justifyContent: 'center',
  },
  minimalCard: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 40,
    borderWidth: 1,
    borderColor: '#1C1C1E',
    padding: 40,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
  },
  dateText: {
    color: '#48484A',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heroSection: {
    alignItems: 'center',
    marginVertical: 40,
  },
  heroValue: {
    color: '#FFF',
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: -1,
    marginBottom: 12,
  },
  subMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  subValue: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '600',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#2C2C2E',
  },
  bottomSection: {
    gap: 32,
  },
  statLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  verticalDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#1C1C1E',
  },
  personaRow: {
    alignItems: 'center',
    gap: 4,
  },
  personaLabel: {
    color: '#48484A',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
  },
  personaValue: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  footerBranding: {
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    color: '#2C2C2E',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
});
