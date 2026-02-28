import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Insight, InsightCategory, useInsights } from '@/hooks/useInsights';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import {
    CheckCircle,
    CircleArrowDown,
    Compass,
    Eye,
    TrendingDown,
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
    TrendingDown,
    CircleArrowDown,
    Zap,
    Compass,
};

const CATEGORY_CONFIG: Record<InsightCategory, { color: string; emptyIcon: any; emptyTitle: string; emptyMessage: string }> = {
    'Buy': {
        color: '#34C759',
        emptyIcon: CheckCircle,
        emptyTitle: 'No Buy Signals',
        emptyMessage: 'No significant buy opportunities detected. Your portfolio looks well-positioned.',
    },
    'Sell/Hold': {
        color: '#FF3B30',
        emptyIcon: CheckCircle,
        emptyTitle: 'No Sell Signals',
        emptyMessage: 'No positions flagged for selling. You\'re holding strong on all fronts.',
    },
    'Observe': {
        color: '#007AFF',
        emptyIcon: Eye,
        emptyTitle: 'Nothing to Watch',
        emptyMessage: 'No notable market events detected for your holdings right now.',
    },
};

export default function InsightsScreen() {
    const router = useRouter();
    const theme = useColorScheme() ?? 'dark';
    const currColors = Colors[theme];
    const { insights, countByCategory } = useInsights();
    const [activeTab, setActiveTab] = useState<InsightCategory>('Buy');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredInsights = useMemo(() => {
        let result = insights.filter(i => i.category === activeTab);
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(i =>
                i.title.toLowerCase().includes(query) ||
                (i.symbol && i.symbol.toLowerCase().includes(query)) ||
                i.badge.toLowerCase().includes(query)
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

                    {/* Center: Company Name, Badge, Reason & Value */}
                    <View style={styles.textBox}>
                        <View style={styles.titleRow}>
                            <Text style={[styles.companyName, { color: currColors.text }]} numberOfLines={1}>
                                {insight.title}
                            </Text>
                        </View>
                        {/* Badge pill + value pill side-by-side */}
                        <View style={styles.pillRow}>
                            <View style={[styles.badgePill, { backgroundColor: `${insight.color}22` }]}>
                                <Text style={[styles.badgeText, { color: insight.color }]}>
                                    {insight.badge}
                                </Text>
                            </View>
                            <View style={[styles.valuePill, { backgroundColor: `${insight.color}${theme === 'dark' ? '25' : '15'}` }]}>
                                <Text style={[styles.valueText, { color: insight.color }]}>
                                    {insight.value}
                                </Text>
                            </View>
                        </View>
                        {/* Reason text — full width, no line limit */}
                        <Text style={[styles.reasonText, { color: currColors.textSecondary }]}>
                            {insight.reason}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderEmptyState = () => {
        const config = CATEGORY_CONFIG[activeTab];
        const EmptyIcon = config.emptyIcon;
        return (
            <View style={styles.emptyState}>
                <View style={[styles.emptyIconCircle, { backgroundColor: `${config.color}18` }]}>
                    <EmptyIcon size={32} color={config.color} />
                </View>
                <Text style={[styles.emptyTitle, { color: currColors.text }]}>
                    {config.emptyTitle}
                </Text>
                <Text style={[styles.emptyMessage, { color: currColors.textSecondary }]}>
                    {config.emptyMessage}
                </Text>
            </View>
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

            {/* Category Tabs with Count Badges */}
            <View style={styles.tabContainer}>
                {(['Buy', 'Sell/Hold', 'Observe'] as InsightCategory[]).map((tab) => {
                    const isActive = activeTab === tab;
                    const tabColor = CATEGORY_CONFIG[tab].color;
                    const tabCount = countByCategory[tab];
                    return (
                        <TouchableOpacity
                            key={tab}
                            style={[
                                styles.tab,
                                {
                                    backgroundColor: isActive ? tabColor : 'transparent',
                                    borderColor: isActive ? tabColor : (theme === 'dark' ? '#3A3A3C' : currColors.border),
                                }
                            ]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setActiveTab(tab);
                            }}
                        >
                            <Text style={[styles.tabText, { color: isActive ? '#FFF' : currColors.textSecondary }]}>
                                {tab}
                            </Text>
                            {tabCount > 0 && (
                                <View style={[
                                    styles.tabBadge,
                                    {
                                        backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : `${tabColor}30`,
                                    }
                                ]}>
                                    <Text style={[
                                        styles.tabBadgeText,
                                        { color: isActive ? '#FFF' : tabColor }
                                    ]}>
                                        {tabCount}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
            >
                <Text style={styles.sectionLabel}>{activeTab.toUpperCase()} OPPORTUNITIES</Text>

                {filteredInsights.length > 0 ? (
                    <View style={[styles.insightCard, { backgroundColor: currColors.card }]}>
                        {filteredInsights.map((insight, index) =>
                            renderInsightItem(insight, index, filteredInsights.length - 1)
                        )}
                    </View>
                ) : (
                    renderEmptyState()
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
    // Summary banner
    summaryBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    summaryItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    summaryDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    summaryLabel: {
        fontSize: 13,
    },
    summaryDivider: {
        width: 1,
        height: 16,
        backgroundColor: '#3A3A3C',
        marginHorizontal: 4,
    },
    // Tabs
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingBottom: 12,
        gap: 8,
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
        borderWidth: 1,
        gap: 6,
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
    },
    tabBadge: {
        minWidth: 20,
        height: 18,
        borderRadius: 9,
        paddingHorizontal: 5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabBadgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    // Scroll
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
        marginTop: 4,
    },
    // Insight card container
    insightCard: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    insightItem: {
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 2,
        flexShrink: 0,
    },
    textBox: {
        flex: 1,
        justifyContent: 'center',
        gap: 4,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    companyName: {
        fontSize: 15,
        fontWeight: '600',
    },
    pillRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
    },
    badgePill: {
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    reasonText: {
        fontSize: 12,
        lineHeight: 17,
    },
    valuePill: {
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    valueText: {
        fontSize: 11,
        fontWeight: '700',
        textAlign: 'center',
    },
    // Empty state
    emptyState: {
        marginTop: 60,
        alignItems: 'center',
        paddingHorizontal: 24,
        gap: 12,
    },
    emptyIconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    emptyTitle: {
        fontSize: 17,
        fontWeight: '700',
        textAlign: 'center',
    },
    emptyMessage: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
});
