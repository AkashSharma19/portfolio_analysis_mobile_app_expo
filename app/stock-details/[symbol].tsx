import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { ArrowDownLeft, ArrowLeft, ArrowUpRight } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { SafeAreaView } from 'react-native-safe-area-context';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface NewsItem {
    title: string;
    link: string;
    pubDate: string;
    source: string;
}

export default function StockDetailsScreen() {
    const { symbol } = useLocalSearchParams<{ symbol: string }>();
    const router = useRouter();
    const getHoldingsData = usePortfolioStore((state) => state.getHoldingsData);
    const transactions = usePortfolioStore((state) => state.transactions);
    const tickers = usePortfolioStore((state) => state.tickers);
    const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
    const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);

    const colorScheme = useColorScheme() ?? 'dark';
    const currColors = Colors[colorScheme];

    const [news, setNews] = React.useState<NewsItem[]>([]);
    const [loadingNews, setLoadingNews] = React.useState(true);

    const holding = useMemo(() => {
        const holdings = getHoldingsData();
        const foundHolding = holdings.find((h) => h.symbol === symbol);
        if (foundHolding) return foundHolding;

        // If not in holdings, look up ticker info
        const ticker = tickers.find(t => t.Tickers === symbol);
        if (ticker) {
            return {
                symbol: ticker.Tickers,
                companyName: ticker['Company Name'],
                quantity: 0,
                avgPrice: 0,
                currentPrice: ticker['Current Value'],
                investedValue: 0,
                currentValue: 0,
                pnl: 0,
                pnlPercentage: 0,
                contributionPercentage: 0,
                assetType: ticker['Asset Type'] || 'Other',
                sector: ticker['Sector'] || 'Other',
                broker: 'N/A',
                dayChange: ticker['Current Value'] - (ticker['Yesterday Close'] || ticker['Current Value']),
                dayChangePercentage: ticker['Yesterday Close'] ? ((ticker['Current Value'] - ticker['Yesterday Close']) / ticker['Yesterday Close']) * 100 : 0,
                high52: ticker.High52,
                low52: ticker.Low52,
            };
        }
        return null;
    }, [getHoldingsData, symbol, transactions, tickers]);

    React.useEffect(() => {
        const fetchNews = async () => {
            if (!holding) return;
            try {
                setLoadingNews(true);
                const query = encodeURIComponent(`${holding.companyName} stock news India`);
                const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=en-IN&gl=IN&ceid=IN:en`;
                const response = await fetch(rssUrl);
                const text = await response.text();

                const items = text.match(/<item>[\s\S]*?<\/item>/g) || [];
                const parsedNews = items.map(item => ({
                    title: item.match(/<title>(.*?)<\/title>/)?.[1] || '',
                    link: item.match(/<link>(.*?)<\/link>/)?.[1] || '',
                    pubDate: item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '',
                    source: item.match(/<source.*?>(.*?)<\/source>/)?.[1] || ''
                }))
                    .filter(item => item.title && item.link)
                    .map(item => {
                        // Clean title - remove source from the end (usually " - Source")
                        const cleanTitle = item.title.split(' - ').slice(0, -1).join(' - ') || item.title;
                        return { ...item, title: cleanTitle };
                    })
                    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
                    .slice(0, 5);

                setNews(parsedNews);
            } catch (error) {
                console.error('Failed to fetch news:', error);
            } finally {
                setLoadingNews(false);
            }
        };

        fetchNews();
    }, [holding?.companyName]);

    const handleOpenNews = async (url: string) => {
        try {
            await WebBrowser.openBrowserAsync(url);
        } catch (error) {
            console.error('Error opening browser:', error);
        }
    };

    const stockTransactions = useMemo(() => {
        return transactions
            .filter((t) => t.symbol === symbol)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, symbol]);

    const tickerData = usePortfolioStore((state) => state.tickers.find(t => t.Tickers === symbol));

    const chartData = useMemo(() => {
        if (!tickerData) return [];

        const dataPoints = [
            { value: tickerData['Today - 7'], label: '7d' },
            { value: tickerData['Today - 6'], label: '6d' },
            { value: tickerData['Today - 5'], label: '5d' },
            { value: tickerData['Today - 4'], label: '4d' },
            { value: tickerData['Today - 3'], label: '3d' },
            { value: tickerData['Today - 2'], label: '2d' },
            { value: tickerData['Yesterday Close'], label: '1d' },
            { value: tickerData['Current Value'], label: 'Now' }
        ];

        // Filter out undefined/null values in case data is partial 
        // (though if user says they added it, it should be there, but we need to handle gaps)
        // Actually, we should probably only define points that exist.
        // Assuming consecutive data:
        const validPoints = dataPoints.filter(p => typeof p.value === 'number' && p.value > 0).map(p => ({
            value: p.value as number,
            label: '', // Empty label to hide X-axis text
            dataLabel: p.label, // Custom prop for tooltip
        }));

        return validPoints;
    }, [tickerData]);

    const isPositiveTrend = useMemo(() => {
        return (holding?.dayChangePercentage ?? 0) >= 0;
    }, [holding?.dayChangePercentage]);

    if (!holding) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: currColors.background }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
                <View style={[styles.header, { backgroundColor: currColors.background }]}>
                    <TouchableOpacity
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            router.back();
                        }}
                        style={[styles.backButton, { backgroundColor: currColors.card }]}
                    >
                        <ArrowLeft size={24} color={currColors.text} />
                    </TouchableOpacity>
                </View>
                <View style={[styles.centerContent, { backgroundColor: currColors.background }]}>
                    <Text style={[styles.errorText, { color: currColors.text }]}>Company details not found</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: currColors.background }]} edges={['top', 'left', 'right']}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

            {/* Header */}
            <View style={[styles.header, { backgroundColor: currColors.background }]}>
                <TouchableOpacity
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.back();
                    }}
                    style={[styles.backButton, { backgroundColor: currColors.card }]}
                >
                    <ArrowLeft size={24} color={currColors.text} />
                </TouchableOpacity>
                <View style={styles.headerTitle}>
                    <Text style={[styles.companyName, { color: currColors.text }]} numberOfLines={2}>{holding.companyName}</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
                bounces={false}
                overScrollMode="never"
            >
                {/* Hero Chart (7 Day Trend) */}


                {/* Main Price Card */}
                <View style={[styles.priceCard, { overflow: 'hidden', backgroundColor: currColors.card, borderColor: currColors.border }]}>
                    {/* Background Chart */}
                    {chartData.length > 2 && (
                        <View style={{ position: 'absolute', bottom: 0, left: -16, right: 0, top: 0, overflow: 'hidden' }} pointerEvents="none">
                            <View style={{ opacity: 0.15, transform: [{ translateY: 40 }] }} pointerEvents="none">
                                <LineChart
                                    data={chartData}
                                    areaChart
                                    curved
                                    color={isPositiveTrend ? '#4CAF50' : '#F44336'}
                                    startFillColor={isPositiveTrend ? 'rgba(76, 175, 80, 0.8)' : 'rgba(244, 67, 54, 0.8)'}
                                    endFillColor={isPositiveTrend ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)'}
                                    thickness={5}
                                    hideDataPoints
                                    hideRules
                                    hideYAxisText
                                    hideAxesAndRules
                                    yAxisOffset={Math.min(...chartData.map(d => d.value)) * 0.95}
                                    height={320}
                                    width={SCREEN_WIDTH - 20}
                                    adjustToWidth={true}
                                    initialSpacing={0}
                                    endSpacing={0}
                                    disableScroll={true}
                                />
                            </View>
                        </View>
                    )}
                    <View style={{ padding: 24 }}>
                        <View style={styles.heroHeaderRow}>
                            <Text style={[styles.heroLabel, { color: currColors.textSecondary }]}>{holding.quantity > 0 ? 'CURRENT VALUE' : 'CURRENT PRICE'}</Text>
                        </View>

                        <Text style={[styles.heroValue, { color: currColors.text }]}>
                            {isPrivacyMode ? '****' : `${showCurrencySymbol ? '₹' : ''}${(holding.quantity > 0 ? holding.currentValue : holding.currentPrice).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`}
                        </Text>

                        <View style={[styles.dashedDivider, { borderColor: currColors.border }]} />

                        <View style={styles.heroRow}>
                            <Text style={[styles.heroRowLabel, { color: currColors.textSecondary }]}>{holding.quantity > 0 ? '1D returns' : '1D change'}</Text>
                            <Text style={[styles.heroRowValue, { color: isPrivacyMode ? currColors.text : (holding.dayChange >= 0 ? '#4CAF50' : '#F44336') }]}>
                                {isPrivacyMode ? '****' : `${holding.dayChange >= 0 ? '+' : ''}${showCurrencySymbol ? '₹' : ''}${Math.abs(holding.quantity > 0 ? holding.dayChange : (holding.dayChange)).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} (${Math.abs(holding.dayChangePercentage).toFixed(2)}%)`}
                            </Text>
                        </View>

                        {holding.quantity > 0 && (
                            <View style={styles.heroRow}>
                                <Text style={[styles.heroRowLabel, { color: currColors.textSecondary }]}>Total returns</Text>
                                <Text style={[styles.heroRowValue, { color: isPrivacyMode ? currColors.text : (holding.pnl >= 0 ? '#4CAF50' : '#F44336') }]}>
                                    {isPrivacyMode ? '****' : `${holding.pnl >= 0 ? '+' : '-'}${showCurrencySymbol ? '₹' : ''}${Math.abs(holding.pnl).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} (${Math.abs(holding.pnlPercentage).toFixed(2)}%)`}
                                </Text>
                            </View>
                        )}

                        {holding.quantity > 0 ? (
                            <>
                                <View style={styles.heroRow}>
                                    <Text style={[styles.heroRowLabel, { color: currColors.textSecondary }]}>Invested</Text>
                                    <Text style={[styles.heroRowValueWhite, { color: currColors.text }]}>{isPrivacyMode ? '****' : `${showCurrencySymbol ? '₹' : ''}${holding.investedValue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`}</Text>
                                </View>

                                <View style={styles.heroRow}>
                                    <Text style={[styles.heroRowLabel, { color: currColors.textSecondary }]}>Quantity</Text>
                                    <Text style={[styles.heroRowValueWhite, { color: currColors.text }]}>{holding.quantity}</Text>
                                </View>

                                <View style={styles.heroRow}>
                                    <Text style={[styles.heroRowLabel, { color: currColors.textSecondary }]}>Current Price</Text>
                                    <Text style={[styles.heroRowValueWhite, { color: currColors.text }]}>{showCurrencySymbol ? '₹' : ''}{holding.currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</Text>
                                </View>

                                <View style={styles.heroRow}>
                                    <Text style={[styles.heroRowLabel, { color: currColors.textSecondary }]}>Avg. Price</Text>
                                    <Text style={[styles.heroRowValueWhite, { color: currColors.text }]}>{isPrivacyMode ? '****' : `${showCurrencySymbol ? '₹' : ''}${holding.avgPrice.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`}</Text>
                                </View>
                            </>
                        ) : (
                            <View style={styles.heroRow}>
                                <Text style={[styles.heroRowLabel, { color: currColors.textSecondary }]}>Current Price</Text>
                                <Text style={[styles.heroRowValueWhite, { color: currColors.text }]}>{showCurrencySymbol ? '₹' : ''}{holding.currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</Text>
                            </View>
                        )}

                        <View style={styles.heroRow}>
                            <Text style={[styles.heroRowLabel, { color: currColors.textSecondary }]}>Sector</Text>
                            <Text style={[styles.heroRowValueWhite, { color: currColors.text }]} numberOfLines={1}>{holding.sector}</Text>
                        </View>
                    </View>
                </View>



                {/* 52 Week Range */}
                {typeof holding.high52 === 'number' && typeof holding.low52 === 'number' && holding.high52 > 0 && holding.low52 > 0 && holding.assetType !== 'Mutual Fund' && (
                    <View style={[styles.rangeCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
                        <Text style={[styles.sectionTitle, { color: currColors.textSecondary, marginBottom: 16 }]}>52 WEEK RANGE</Text>

                        <View style={styles.rangeRowContainer}>
                            <View>
                                <Text style={[styles.rangeLabel, { color: currColors.textSecondary }]}>Low</Text>
                                <Text style={[styles.rangeValueCompact, { color: currColors.text }]}>{showCurrencySymbol ? '₹' : ''}{holding.low52.toLocaleString('en-IN')}</Text>
                            </View>

                            <View style={styles.rangeBarContainer}>
                                <View style={[styles.rangeTrack, { backgroundColor: currColors.border }]} />
                                <View
                                    style={[
                                        styles.rangeFill,
                                        {
                                            backgroundColor: ((holding.currentPrice - holding.low52) / (holding.high52 - holding.low52)) >= 0.5 ? '#4CAF50' : '#F44336',
                                            width: `${Math.min(100, Math.max(0, ((holding.currentPrice - holding.low52) / (holding.high52 - holding.low52)) * 100))}%`
                                        }
                                    ]}
                                />
                                <View
                                    style={[
                                        styles.rangeKnob,
                                        {
                                            left: `${Math.min(100, Math.max(0, ((holding.currentPrice - holding.low52) / (holding.high52 - holding.low52)) * 100))}%`,
                                            borderColor: currColors.card
                                        }
                                    ]}
                                >
                                    <View style={[styles.knobInner, { backgroundColor: ((holding.currentPrice - holding.low52) / (holding.high52 - holding.low52)) >= 0.5 ? '#4CAF50' : '#F44336' }]} />
                                </View>
                            </View>

                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={[styles.rangeLabel, { color: currColors.textSecondary }]}>High</Text>
                                <Text style={[styles.rangeValueCompact, { color: currColors.text }]}>{showCurrencySymbol ? '₹' : ''}{holding.high52.toLocaleString('en-IN')}</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Hide transactions if none exist */}
                {stockTransactions.length > 0 && (
                    <>
                        {/* Transactions History */}
                        <Text style={[styles.sectionTitle, { color: currColors.textSecondary }]}>HISTORY</Text>
                        <View style={[styles.historyList, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
                            {stockTransactions.map((item: any) => (
                                <View key={item.id} style={[styles.historyItem, { borderBottomColor: currColors.border }]}>
                                    <View style={[styles.iconContainer, { backgroundColor: item.type === 'BUY' ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255, 59, 48, 0.15)' }]}>
                                        {item.type === 'BUY' ? (
                                            <ArrowUpRight size={20} color="#34C759" />
                                        ) : (
                                            <ArrowDownLeft size={20} color="#FF3B30" />
                                        )}
                                    </View>
                                    <View style={styles.historyInfo}>
                                        <Text style={[styles.historyType, { color: currColors.text }]}>{item.type === 'BUY' ? 'Bought' : 'Sold'}</Text>
                                        <Text style={[styles.historyDate, { color: currColors.textSecondary }]}>{format(new Date(item.date), 'MMM dd, yyyy')}</Text>
                                    </View>
                                    <View style={styles.historyAmount}>
                                        <Text style={[styles.historyValue, { color: currColors.text }]}>
                                            {isPrivacyMode ? '****' : `${showCurrencySymbol ? '₹' : ''}${(item.quantity * item.price).toLocaleString()}`}
                                        </Text>
                                        <Text style={[styles.historyDetails, { color: currColors.textSecondary }]}>{item.quantity} @ {isPrivacyMode ? '****' : item.price.toLocaleString()}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </>
                )}

                {/* News Section */}
                <Text style={[styles.sectionTitle, { color: currColors.textSecondary, marginTop: 24 }]}>LATEST NEWS</Text>
                {loadingNews ? (
                    <View style={styles.newsLoadingContainer}>
                        <Text style={{ color: currColors.textSecondary, fontSize: 13 }}>Fetching latest updates...</Text>
                    </View>
                ) : news.length === 0 ? (
                    <View style={[styles.emptyNewsCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
                        <Text style={{ color: currColors.textSecondary, fontSize: 13 }}>No recent news found for this company.</Text>
                    </View>
                ) : (
                    <View style={styles.newsList}>
                        {news.map((item, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[styles.newsCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}
                                onPress={() => handleOpenNews(item.link)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.newsSourceRow}>
                                    <Text style={[styles.newsSource, { color: '#007AFF' }]}>{item.source.toUpperCase()}</Text>
                                    <Text style={[styles.newsDate, { color: currColors.textSecondary }]}>
                                        {item.pubDate.split(' ').slice(1, 4).join(' ')}
                                    </Text>
                                </View>
                                <Text style={[styles.newsTitle, { color: currColors.text }]} numberOfLines={3}>
                                    {item.title}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

            </ScrollView>
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#1C1C1E',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    symbol: {
        color: '#8E8E93',
        fontSize: 12,
    },
    companyName: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: '#FFF',
        fontSize: 16,
    },
    priceCard: {
        backgroundColor: '#1C1C1E',
        borderRadius: 24,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    priceHeader: {
        marginBottom: 16,
    },
    currentPriceLabel: {
        color: '#8E8E93',
        fontSize: 12,
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    currentPrice: {
        color: '#FFF',
        fontSize: 32,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: '#2C2C2E',
        marginBottom: 16,
    },
    pnlRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    pnlLabel: {
        color: '#8E8E93',
        fontSize: 12,
        marginBottom: 6,
    },
    pnlValueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    pnlValue: {
        fontSize: 18,
        fontWeight: '500',
    },
    sectionTitle: {
        color: '#8E8E93',
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 16,
        marginLeft: 4,
    },
    historyList: {
        backgroundColor: '#1C1C1E',
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#2C2C2E',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    historyInfo: {
        flex: 1,
    },
    historyType: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 2,
    },
    historyDate: {
        color: '#8E8E93',
        fontSize: 12,
    },
    historyAmount: {
        alignItems: 'flex-end',
    },
    historyValue: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 2,
    },
    historyDetails: {
        color: '#8E8E93',
        fontSize: 11,
    },
    heroHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
    heroLabel: {
        color: '#8E8E93',
        fontSize: 11,
        fontWeight: '400',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    heroValue: {
        fontSize: 24,
        fontWeight: '400',
        color: '#FFF',
        marginBottom: 16,
    },
    dashedDivider: {
        height: 1,
        borderWidth: 1,
        borderColor: '#333',
        borderStyle: 'dashed',
        borderRadius: 1,
        marginBottom: 16,
    },
    heroRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    heroRowLabel: {
        color: '#8E8E93',
        fontSize: 14,
    },
    heroRowValue: {
        fontSize: 14,
        fontWeight: '400',
    },
    heroRowValueWhite: {
        fontSize: 14,
        fontWeight: '400',
        color: '#FFF',
    },
    rangeCard: {
        backgroundColor: '#1C1C1E',
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    rangeRowContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    rangeLabel: {
        fontSize: 10,
        marginBottom: 2,
    },
    rangeValueCompact: {
        fontSize: 13,
        fontWeight: '600',
    },
    rangeBarContainer: {
        flex: 1,
        height: 24, // Enough for knob
        justifyContent: 'center',
    },
    rangeTrack: {
        height: 4,
        borderRadius: 2,
        width: '100%',
        backgroundColor: '#333',
    },
    rangeFill: {
        height: 4,
        borderRadius: 2,
        position: 'absolute',
        left: 0,
    },
    rangeKnob: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#FFF',
        borderWidth: 2,
        position: 'absolute',
        marginLeft: -8, // Center knob
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    knobInner: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },

    heroChartContainer: {
        marginBottom: 16,
        marginHorizontal: -16, // Negative margin to hit edges
        overflow: 'hidden',
    },
    newsList: {
        gap: 12,
    },
    newsCard: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#2C2C2E',
        backgroundColor: '#1C1C1E',
    },
    newsSourceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    newsSource: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    newsDate: {
        fontSize: 10,
    },
    newsTitle: {
        fontSize: 14,
        fontWeight: '500',
        lineHeight: 20,
    },
    newsLoadingContainer: {
        padding: 24,
        alignItems: 'center',
    },
    emptyNewsCard: {
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#2C2C2E',
        alignItems: 'center',
    },
});
