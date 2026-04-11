import React, { useEffect } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import Animated, { useAnimatedProps, withSpring, withTiming, useSharedValue } from 'react-native-reanimated';
import { ThemedText } from './ThemedText';

import { useColorScheme } from './useColorScheme';
import Colors from '@/constants/Colors';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface HealthGaugeProps {
  score: number;
  gradeColor: string;
  grade: string;
}

export const HealthGauge: React.FC<HealthGaugeProps> = ({ score, gradeColor, grade }) => {
  const theme = useColorScheme() ?? 'dark';
  const c = Colors[theme];
  const { width } = useWindowDimensions();
  const size = Math.min(width - 80, 240);
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  const animatedScore = useSharedValue(0);

  useEffect(() => {
    animatedScore.value = withTiming(score, { duration: 1500 });
  }, [score]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference * (1 - animatedScore.value / 100);
    return {
      strokeDashoffset,
    };
  });

  return (
    <View style={styles.container}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <LinearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={gradeColor} stopOpacity={0.6} />
            <Stop offset="100%" stopColor={gradeColor} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        
        {/* Background Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={c.border}
          strokeWidth={strokeWidth}
          fill="none"
          opacity={0.2}
        />
        
        {/* Progress Fill */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#gaugeGradient)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      
      <View style={[styles.textOverlay, { width: size, height: size }]}>
        <ThemedText style={[styles.scoreText, { color: c.text }]}>{score}</ThemedText>
        <ThemedText style={[styles.gradeText, { color: gradeColor }]}>{grade.toUpperCase()}</ThemedText>
        <ThemedText style={[styles.outOfText, { color: c.textSecondary }]}>OUT OF 100</ThemedText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  textOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: -2,
  },
  gradeText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: -4,
  },
  outOfText: {
    fontSize: 10,
    fontWeight: '600',
    opacity: 0.5,
    marginTop: 4,
  },
});
