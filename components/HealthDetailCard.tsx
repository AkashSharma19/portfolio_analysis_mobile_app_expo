import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { ThemedText } from './ThemedText';
import { useColorScheme } from './useColorScheme';
import Colors from '@/constants/Colors';
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Info, Lightbulb } from 'lucide-react-native';
import { HealthDimension } from '@/hooks/usePortfolioHealth';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface HealthDetailCardProps {
  dimension: HealthDimension;
}

export const HealthDetailCard: React.FC<HealthDetailCardProps> = ({ dimension }) => {
  const theme = useColorScheme() ?? 'dark';
  const c = Colors[theme];
  const [expanded, setExpanded] = useState(false);

  const pct = (dimension.score / dimension.maxScore) * 100;
  const scoreColor =
    pct >= 80 ? '#34C759' : pct >= 60 ? '#5AC8FA' : pct >= 40 ? '#FF9500' : '#FF3B30';

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return '#34C759';
      case 'warning': return '#FF9500';
      case 'error': return '#FF3B30';
      default: return c.textSecondary;
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <TouchableOpacity style={styles.header} onPress={toggleExpand} activeOpacity={0.7}>
        <View style={styles.headerLeft}>
          <ThemedText style={[styles.label, { color: c.text }]}>{dimension.label}</ThemedText>
          <ThemedText style={[styles.description, { color: c.textSecondary }]}>
            {dimension.description}
          </ThemedText>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.scoreBox}>
            <ThemedText style={[styles.score, { color: scoreColor }]}>{dimension.score}</ThemedText>
            <ThemedText style={[styles.maxScore, { color: c.textSecondary }]}>/{dimension.maxScore}</ThemedText>
          </View>
          {expanded ? <ChevronUp size={20} color={c.textSecondary} /> : <ChevronDown size={20} color={c.textSecondary} />}
        </View>
      </TouchableOpacity>

      <View style={[styles.progressTrack, { backgroundColor: c.cardSecondary }]}>
        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: scoreColor }]} />
      </View>

      {expanded && (
        <View style={styles.expandedContent}>
          <View style={styles.divider} />
          
          {/* Metrics Grid */}
          <View style={styles.metricsGrid}>
            {dimension.metrics.map((metric, idx) => (
              <View key={idx} style={styles.metricItem}>
                <ThemedText style={[styles.metricLabel, { color: c.textSecondary }]}>{metric.label}</ThemedText>
                <View style={styles.metricValueRow}>
                  <ThemedText style={[styles.metricValue, { color: getStatusColor(metric.status) }]}>
                    {metric.value}
                  </ThemedText>
                  {metric.status === 'good' && <CheckCircle2 size={12} color="#34C759" style={styles.statusIcon} />}
                  {metric.status === 'warning' && <AlertCircle size={12} color="#FF9500" style={styles.statusIcon} />}
                  {metric.status === 'error' && <AlertCircle size={12} color="#FF3B30" style={styles.statusIcon} />}
                </View>
              </View>
            ))}
          </View>

          {/* Insights */}
          <View style={[styles.insightBox, { backgroundColor: c.cardSecondary }]}>
            <Info size={16} color={c.textSecondary} style={styles.boxIcon} />
            <ThemedText style={[styles.insightText, { color: c.text }]}>
              {dimension.insights}
            </ThemedText>
          </View>

          {/* Recommendations */}
          {dimension.recommendations.length > 0 && (
            <View style={styles.recsSection}>
              <View style={styles.recsHeader}>
                <Lightbulb size={16} color="#FFCC00" />
                <ThemedText style={[styles.recsTitle, { color: c.textSecondary }]}>RECOMMENDATIONS</ThemedText>
              </View>
              {dimension.recommendations.map((rec, idx) => (
                <View key={idx} style={styles.recItem}>
                  <View style={[styles.bullet, { backgroundColor: scoreColor }]} />
                  <ThemedText style={[styles.recText, { color: c.textSecondary }]}>{rec}</ThemedText>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  label: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scoreBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  score: {
    fontSize: 20,
    fontWeight: '700',
  },
  maxScore: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  expandedContent: {
    marginTop: 16,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(150,150,150,0.1)',
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  metricItem: {
    minWidth: '40%',
    flex: 1,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  statusIcon: {
    marginLeft: 4,
  },
  insightBox: {
    padding: 12,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  boxIcon: {
    marginTop: 2,
  },
  insightText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  recsSection: {
    gap: 8,
  },
  recsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  recsTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    opacity: 0.6,
  },
  recItem: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    paddingLeft: 4,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  recText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
});
