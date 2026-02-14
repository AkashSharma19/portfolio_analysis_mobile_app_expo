import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Insight, InsightCategory, useInsights } from '@/hooks/useInsights';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import {
    CircleArrowDown,
    Compass,
    TrendingUp,
    TriangleAlert,
    Zap
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const IconMap: Record<string, any> = {
    TriangleAlert,
    TrendingUp,
    CircleArrowDown,
    Zap,
    Compass,
};

export default function InsightsScreen() {
    const router = useRouter();
    const theme = useColorScheme() ?? 'dark';
    const currColors = Colors[theme];
    const { insights } = useInsights();
    const [activeTab, setActiveTab] = useState<InsightCategory>('Buy');
    const [searchQuery, setSearchQuery] = useState('');

    const categoryColors: Record<InsightCategory, string> = {
        'Buy': '#34C759',
        'Sell/Hold': '#FF3B30',
        'Observe': '#007AFF',
    };

    const filteredInsights = useMemo(() => {
        let result = insights.filter(i => i.category === activeTab);

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(i =>
                i.title.toLowerCase().includes(query) ||
                (i.symbol && i.symbol.toLowerCase().includes(query))
            );
        }

        return result;
    }, [insights, activeTab, searchQuery]);

    const renderInsightItem = (insight: Insight, index: number, lastIndex: number) => {
        const IconComponent = IconMap[insight.icon] || Zap;
        const showBorder = index !== lastIndex;

        return (
            <TouchableOpacity
                key={insight.id}
                activeOpacity={0.7}
                style={[
                    styles.insightItem,
                    { borderBottomColor: currColors.border, borderBottomWidth: showBorder ? 1 : 0 }
                ]}
                onPress={() => {
                    if (insight.symbol) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push(`/stock-details/${insight.symbol}`);
                    }
                }}
            >
                <View style={styles.cardContent}>
                    {/* Left: Logo/Icon */}
                    <View style={[styles.iconBox, !insight.logo && { backgroundColor: currColors.cardSecondary }]}>
                        {insight.logo ? (
                            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 2 }}>
                                <Image
                                    source={{ uri: insight.logo }}
                                    style={{ width: 40, height: 40, borderRadius: 10 }}
                                    resizeMode="contain"
                                />
                            </View>
                        ) : (
                            <IconComponent size={24} color={insight.color} />
                        )}
                    </View>

                    {/* Center: Company Name & Invested Value */}
                    <View style={styles.textBox}>
                        <Text style={[styles.companyName, { color: currColors.text }]} numberOfLines={1}>
                            {insight.title}
                        </Text>
                        <Text style={[styles.tickerText, { color: currColors.textSecondary }]}>
                            {insight.subtitle}
                        </Text>
                    </View>

                    {/* Right: Value Pill */}
                    <View style={[styles.valuePill, { backgroundColor: `${insight.color}15` }]}>
                        <Text style={[styles.valueText, { color: insight.color }]}>
                            {insight.value}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: currColors.background }]} edges={['top']}>
            {/* Search Header */}
            <View style={styles.header}>
                <View style={styles.searchContainerOuter}>
                    <View style={[styles.searchContainer, { backgroundColor: currColors.card }]}>
                        <Ionicons name="search" size={20} color={currColors.textSecondary} style={styles.searchIcon} />
                        <TextInput
                            style={[styles.searchInput, { color: currColors.text }]}
                            placeholder="Search insights"
                            placeholderTextColor={currColors.textSecondary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                                <Ionicons name="close-circle" size={18} color={currColors.textSecondary} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>

            {/* Compact Action Tabs */}
            <View style={styles.tabContainer}>
                {(['Buy', 'Sell/Hold', 'Observe'] as InsightCategory[]).map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[
                            styles.tab,
                            {
                                backgroundColor: activeTab === tab ? categoryColors[tab] : 'transparent',
                                borderColor: activeTab === tab ? categoryColors[tab] : currColors.border
                            }
                        ]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setActiveTab(tab);
                        }}
                    >
                        <Text style={[
                            styles.tabText,
                            { color: activeTab === tab ? '#FFF' : currColors.textSecondary }
                        ]}>
                            {tab}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
            >
                <Text style={styles.sectionLabel}>{activeTab} OPPORTUNITIES</Text>

                {filteredInsights.length > 0 ? (
                    filteredInsights.map((insight, index) => renderInsightItem(insight, index, filteredInsights.length - 1))
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={[styles.emptyText, { color: currColors.textSecondary }]}>
                            No active {activeTab} insights.
                        </Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: 16,
        paddingBottom: 12,
    },
    searchContainerOuter: {
        paddingHorizontal: 16,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        height: '100%',
    },
    clearButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
    },
    tab: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    sectionLabel: {
        color: '#8E8E93',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 8,
        marginTop: 12,
    },
    insightItem: {
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    assetLogo: {
        width: 40,
        height: 40,
        borderRadius: 10,
    },
    textBox: {
        flex: 1,
        justifyContent: 'center',
    },
    companyName: {
        fontSize: 15,
        fontWeight: '500',
        marginBottom: 2,
    },
    tickerText: {
        fontSize: 12,
        fontWeight: '500',
    },
    valuePill: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    valueText: {
        fontSize: 12,
        fontWeight: '600',
    },
    emptyState: {
        marginTop: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
    },
});
