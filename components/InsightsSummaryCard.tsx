import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useInsights } from '@/hooks/useInsights';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { ChevronRight, Sparkles } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export const InsightsSummaryCard = () => {
    const router = useRouter();
    const theme = useColorScheme() ?? 'dark';
    const currColors = Colors[theme];
    const { count, countByCategory } = useInsights();

    if (count === 0) return null;

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/insights');
    };

    return (
        <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.8}
            style={[
                styles.container,
                {
                    backgroundColor: theme === 'dark' ? 'rgba(90, 200, 250, 0.08)' : 'rgba(0, 122, 255, 0.05)',
                    borderColor: theme === 'dark' ? 'rgba(90, 200, 250, 0.2)' : 'rgba(0, 122, 255, 0.1)',
                }
            ]}
        >
            <View style={styles.topRow}>
                <View style={styles.titleRow}>
                    <View style={[styles.iconContainer, { backgroundColor: '#5AC8FA' }]}>
                        <Sparkles size={14} color="#FFF" />
                    </View>
                    <Text style={[styles.title, { color: currColors.text }]}>
                        {count} Actionable {count === 1 ? 'Insight' : 'Insights'}
                    </Text>
                </View>
                <ChevronRight size={18} color={currColors.textSecondary} />
            </View>

            <View style={styles.categoryRow}>
                {countByCategory['Buy'] > 0 && (
                    <View style={styles.categoryChip}>
                        <View style={[styles.categoryDot, { backgroundColor: '#34C759' }]} />
                        <Text style={[styles.categoryText, { color: currColors.textSecondary }]}>
                            <Text style={{ color: '#34C759', fontWeight: '700' }}>{countByCategory['Buy']}</Text> Buy
                        </Text>
                    </View>
                )}
                {countByCategory['Sell/Hold'] > 0 && (
                    <View style={styles.categoryChip}>
                        <View style={[styles.categoryDot, { backgroundColor: '#FF3B30' }]} />
                        <Text style={[styles.categoryText, { color: currColors.textSecondary }]}>
                            <Text style={{ color: '#FF3B30', fontWeight: '700' }}>{countByCategory['Sell/Hold']}</Text> Sell/Hold
                        </Text>
                    </View>
                )}
                {countByCategory['Observe'] > 0 && (
                    <View style={styles.categoryChip}>
                        <View style={[styles.categoryDot, { backgroundColor: '#007AFF' }]} />
                        <Text style={[styles.categoryText, { color: currColors.textSecondary }]}>
                            <Text style={{ color: '#007AFF', fontWeight: '700' }}>{countByCategory['Observe']}</Text> Observe
                        </Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 12,
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        gap: 10,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    iconContainer: {
        width: 28,
        height: 28,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 15,
        fontWeight: '600',
    },
    categoryRow: {
        flexDirection: 'row',
        gap: 12,
        paddingLeft: 38, // align under title text
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    categoryDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    categoryText: {
        fontSize: 12,
    },
});
