import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Insight, useInsights } from '@/hooks/useInsights';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import {
    ArrowLeft,
    ChevronRight,
    CircleArrowDown,
    Compass,
    PieChart,
    TrendingUp,
    TriangleAlert,
    Zap
} from 'lucide-react-native';
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const IconMap: Record<string, any> = {
    TriangleAlert, // Changed from AlertTriangle
    TrendingUp,
    CircleArrowDown, // Changed from ArrowDownCircle
    Zap,
    Compass,
    PieChart,
};

const ColorMap: Record<string, string> = {
    warning: '#FF9500',
    success: '#34C759',
    info: '#007AFF',
    opportunity: '#5AC8FA',
};

export default function InsightsScreen() {
    const router = useRouter();
    const theme = useColorScheme() ?? 'dark';
    const currColors = Colors[theme];
    const { insights } = useInsights();
    const [selectedTab, setSelectedTab] = React.useState<'All' | 'Alerts' | 'Opportunities' | 'Profits'>('All');

    const handleBack = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.back();
    };

    const filteredInsights = React.useMemo(() => {
        if (selectedTab === 'All') return insights;
        return insights.filter(i => {
            if (selectedTab === 'Alerts') return i.type === 'warning';
            if (selectedTab === 'Opportunities') return i.type === 'opportunity' || i.type === 'info';
            if (selectedTab === 'Profits') return i.type === 'success';
            return true;
        });
    }, [insights, selectedTab]);

    const renderDescription = (text: string) => {
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return (
            <Text style={[styles.insightDescription, { color: currColors.textSecondary }]}>
                {parts.map((part, index) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return (
                            <Text key={index} style={[styles.highlightText, { color: currColors.text }]}>
                                {part.slice(2, -2)}
                            </Text>
                        );
                    }
                    return part;
                })}
            </Text>
        );
    };

    const renderInsight = (insight: Insight) => {
        const IconComponent = IconMap[insight.icon] || TriangleAlert;
        const typeColor = ColorMap[insight.type] || currColors.tint;

        // Custom labels for better "at-a-glance" understanding
        const getCategoryLabel = (type: string, id: string) => {
            if (id.startsWith('profit')) return 'PROFIT TAKE';
            if (id.startsWith('dca')) return 'DCA BUY';
            if (id.startsWith('conc')) return 'CONCENTRATION';
            if (id.startsWith('high')) return 'PEAK';
            if (id.startsWith('low')) return 'ENTRY';
            if (id.startsWith('div')) return 'DIVERSIFY';
            return type.toUpperCase();
        };

        return (
            <View
                key={insight.id}
                style={[
                    styles.insightCard,
                    { backgroundColor: currColors.card, borderColor: currColors.border }
                ]}
            >
                <View style={styles.categoryBadgeAbsolute}>
                    <View style={[styles.miniCategoryBadge, { backgroundColor: `${typeColor}20` }]}>
                        <IconComponent size={10} color={typeColor} />
                        <Text style={[styles.categoryLabel, { color: typeColor }]}>
                            {getCategoryLabel(insight.type, insight.id)}
                        </Text>
                    </View>
                </View>

                <View style={styles.insightHeader}>
                    {insight.logo ? (
                        <View style={[styles.logoWrapper, { backgroundColor: '#FFFFFF' }]}>
                            <Image
                                source={{ uri: insight.logo }}
                                style={styles.logoImage}
                                resizeMode="contain"
                            />
                        </View>
                    ) : (
                        <View style={[styles.iconWrapper, { backgroundColor: `${typeColor}20` }]}>
                            <IconComponent size={20} color={typeColor} />
                        </View>
                    )}
                    <View style={styles.titleWrapper}>
                        <Text style={[styles.insightTitle, { color: currColors.text, paddingRight: 80 }]}>
                            {insight.name || insight.title}
                        </Text>
                    </View>
                </View>

                {renderDescription(insight.description)}

                {insight.symbol && (
                    <TouchableOpacity
                        style={[styles.actionButton, { borderTopColor: currColors.border }]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            if (insight.symbol) {
                                router.push(`/stock-details/${insight.symbol}`);
                            }
                        }}
                    >
                        <Text style={[styles.actionText, { color: currColors.tint }]}>View Asset Details</Text>
                        <ChevronRight size={16} color={currColors.tint} />
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    const tabs: ('All' | 'Alerts' | 'Opportunities' | 'Profits')[] = ['All', 'Alerts', 'Opportunities', 'Profits'];
    const horizontalScrollRef = React.useRef<ScrollView>(null);
    const [pageWidth, setPageWidth] = React.useState(0);

    const onPageLayout = (event: any) => {
        setPageWidth(event.nativeEvent.layout.width);
    };

    const handleTabPress = (tab: typeof selectedTab, index: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedTab(tab);
        horizontalScrollRef.current?.scrollTo({ x: index * pageWidth, animated: true });
    };

    const onHorizontalScroll = (event: any) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const page = Math.round(offsetX / pageWidth);
        if (page >= 0 && page < tabs.length) {
            setSelectedTab(tabs[page]);
        }
    };

    const renderInsightList = (tabType: typeof selectedTab) => {
        const list = tabType === 'All' ? insights : insights.filter(i => {
            if (tabType === 'Alerts') return i.type === 'warning';
            if (tabType === 'Opportunities') return i.type === 'opportunity' || i.type === 'info';
            if (tabType === 'Profits') return i.type === 'success';
            return true;
        });

        return (
            <ScrollView
                key={tabType}
                style={{ width: pageWidth }}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
            >
                {list.length > 0 ? (
                    list.map(renderInsight)
                ) : (
                    <View style={styles.emptyState}>
                        <Compass size={48} color={currColors.textSecondary} style={{ marginBottom: 16 }} />
                        <Text style={[styles.emptyText, { color: currColors.textSecondary }]}>
                            No {tabType.toLowerCase()} insights at the moment.
                        </Text>
                    </View>
                )}
            </ScrollView>
        );
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: currColors.background }]} edges={['top', 'left', 'right']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <ArrowLeft size={24} color={currColors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: currColors.text }]}>Portfolio Insights</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={[styles.tabContainer, { borderBottomColor: currColors.border }]}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tabScrollContent}
                    bounces={false}
                >
                    {tabs.map((tab, index) => {
                        const isActive = selectedTab === tab;
                        const count = tab === 'All' ? insights.length : insights.filter(i => {
                            if (tab === 'Alerts') return i.type === 'warning';
                            if (tab === 'Opportunities') return i.type === 'opportunity' || i.type === 'info';
                            if (tab === 'Profits') return i.type === 'success';
                            return false;
                        }).length;

                        return (
                            <TouchableOpacity
                                key={tab}
                                style={[
                                    styles.tabButton,
                                    isActive && { borderBottomColor: currColors.tint }
                                ]}
                                onPress={() => handleTabPress(tab, index)}
                            >
                                <Text style={[
                                    styles.tabText,
                                    { color: isActive ? currColors.text : currColors.textSecondary }
                                ]}>
                                    {tab} ({count})
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            <View style={{ flex: 1 }} onLayout={onPageLayout}>
                {pageWidth > 0 && (
                    <ScrollView
                        ref={horizontalScrollRef}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={onHorizontalScroll}
                        bounces={false}
                    >
                        {tabs.map(renderInsightList)}
                    </ScrollView>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    tabContainer: {
        borderBottomWidth: 1,
        marginBottom: 8,
    },
    tabScrollContent: {
        paddingHorizontal: 16,
    },
    tabButton: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    introSection: {
        marginBottom: 24,
    },
    introTitle: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 8,
    },
    introDescription: {
        fontSize: 16,
        lineHeight: 22,
    },
    insightCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
    },
    insightHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    iconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    logoWrapper: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        padding: 4,
        overflow: 'hidden',
    },
    logoImage: {
        width: '100%',
        height: '100%',
    },
    categoryBadgeAbsolute: {
        position: 'absolute',
        top: 12,
        right: 12,
        zIndex: 1,
    },
    miniCategoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 6,
    },
    categoryLabel: {
        fontSize: 10,
        fontWeight: '800',
        marginLeft: 4,
        letterSpacing: 0.5,
    },
    titleWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    insightTitle: {
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
    },
    symbolBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
    },
    symbolText: {
        fontSize: 10,
        fontWeight: '700',
    },
    insightDescription: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 12,
    },
    highlightText: {
        fontWeight: '700',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 12,
        borderTopWidth: 1,
    },
    actionText: {
        fontSize: 14,
        fontWeight: '600',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
        paddingHorizontal: 40,
    },
    emptyText: {
        textAlign: 'center',
        fontSize: 16,
        lineHeight: 24,
    },
});
