import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Activity, ArrowLeft, Box, LayoutGrid, PieChart, Shield, TrendingUp } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PortfolioHealthFormulaScreen() {
    const router = useRouter();
    const theme = useColorScheme() ?? 'dark';
    const c = Colors[theme];

    const Section = ({ icon: Icon, title, points, children }: any) => (
        <View style={[styles.sectionCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={styles.sectionHeader}>
                <View style={[styles.iconBox, { backgroundColor: c.cardSecondary }]}>
                    <Icon size={20} color={c.tint} />
                </View>
                <View style={styles.titleBox}>
                    <Text style={[styles.sectionTitle, { color: c.text }]}>{title}</Text>
                    <Text style={[styles.pointsText, { color: c.textSecondary }]}>Max {points} Points</Text>
                </View>
            </View>
            <View style={styles.sectionDivider} />
            {children}
        </View>
    );

    const Row = ({ label, value, isLast = false }: any) => (
        <View style={[styles.formulaRow, !isLast && { borderBottomWidth: 1, borderBottomColor: c.border }]}>
            <Text style={[styles.formulaLabel, { color: c.textSecondary }]}>{label}</Text>
            <Text style={[styles.formulaValue, { color: c.text }]}>{value}</Text>
        </View>
    );

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: c.background }]} edges={['top', 'left', 'right']}>
            <View style={[styles.header, { backgroundColor: c.background }]}>
                <TouchableOpacity
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.back();
                    }}
                    style={[styles.backButton, { borderColor: c.border }]}
                >
                    <ArrowLeft size={24} color={c.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: c.text }]}>Scoring Formula</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
            >
                <Text style={[styles.introText, { color: c.textSecondary }]}>
                    Your Portfolio Health Score is calculated based on five advanced dimensions to provide a deep assessment of diversification, risk, and performance.
                </Text>

                {/* 1. Diversity & Asset Mix */}
                <Section icon={LayoutGrid} title="Diversity & Asset Mix" points={25}>
                    <Text style={[styles.description, { color: c.textSecondary }]}>
                        Evaluates breadth across sectors, market caps (Large/Mid/Small/ETF), and stock count.
                    </Text>
                    <View style={styles.subHeader}>
                        <Text style={[styles.subTitle, { color: c.text }]}>Stock Count</Text>
                    </View>
                    <Row label="12+ Stocks" value="9 pts" />
                    <Row label="8 - 11 Stocks" value="7 pts" />
                    <View style={styles.subHeader}>
                        <Text style={[styles.subTitle, { color: c.text }]}>Sectors Reach</Text>
                    </View>
                    <Row label="6+ Sectors" value="8 pts" />
                    <Row label="4 - 5 Sectors" value="6 pts" />
                    <View style={styles.subHeader}>
                        <Text style={[styles.subTitle, { color: c.text }]}>Asset Type mix</Text>
                    </View>
                    <Row label="4 Types (L/M/S/ETF)" value="8 pts" />
                    <Row label="3 Types" value="6 pts" isLast />
                </Section>

                {/* 2. Concentration Risk */}
                <Section icon={PieChart} title="Concentration Risk" points={20}>
                    <Text style={[styles.description, { color: c.textSecondary }]}>
                        Focuses on the weight of single largest stock and the top 3 combined weight.
                    </Text>
                    <View style={styles.subHeader}>
                        <Text style={[styles.subTitle, { color: c.text }]}>Single Largest Stock</Text>
                    </View>
                    <Row label="< 15% Weight" value="12 pts" />
                    <Row label="15% - 25% Weight" value="8 pts" />
                    <View style={styles.subHeader}>
                        <Text style={[styles.subTitle, { color: c.text }]}>Top 3 Combined</Text>
                    </View>
                    <Row label="< 40% Weight" value="8 pts" />
                    <Row label="40% - 60% Weight" value="5 pts" isLast />
                </Section>

                {/* 3. Performance Quality */}
                <Section icon={TrendingUp} title="Performance Quality" points={20}>
                    <Text style={[styles.description, { color: c.textSecondary }]}>
                        Assesses long-term returns (XIRR) and 'Win Ratio' (percentage of profitable stocks).
                    </Text>
                    <View style={styles.subHeader}>
                        <Text style={[styles.subTitle, { color: c.text }]}>XIRR Yield</Text>
                    </View>
                    <Row label="> 18% XIRR" value="12 pts" />
                    <Row label="12% - 18% XIRR" value="9 pts" />
                    <View style={styles.subHeader}>
                        <Text style={[styles.subTitle, { color: c.text }]}>Win Ratio</Text>
                    </View>
                    <Row label="> 80% Profitable" value="8 pts" />
                    <Row label="60% - 80% Profitable" value="6 pts" isLast />
                </Section>

                {/* 4. Short-term Stability */}
                <Section icon={Shield} title="Short-term Stability" points={20}>
                    <Text style={[styles.description, { color: c.textSecondary }]}>
                        Uses 7-day volatility analysis and positioning relative to 52-week highs/lows.
                    </Text>
                    <View style={styles.subHeader}>
                        <Text style={[styles.subTitle, { color: c.text }]}>7-Day Volatility</Text>
                    </View>
                    <Row label="< 1.0% (Stable)" value="12 pts" />
                    <Row label="1.0% - 2.0% (Moderate)" value="8 pts" />
                    <View style={styles.subHeader}>
                        <Text style={[styles.subTitle, { color: c.text }]}>52W Range Pos</Text>
                    </View>
                    <Row label="Bottom 30% (Advantageous)" value="8 pts" />
                    <Row label="30% - 60% (Mid Range)" value="5 pts" isLast />
                </Section>

                {/* 5. Absolute Profit */}
                <Section icon={Box} title="Absolute Profit" points={15}>
                    <Text style={[styles.description, { color: c.textSecondary }]}>
                        Evaluates the total absolute gain/loss percentage of your entire portfolio.
                    </Text>
                    <Row label="> 25% Profit" value="15 pts" />
                    <Row label="15% - 25% Profit" value="12 pts" />
                    <Row label="5% - 15% Profit" value="8 pts" />
                    <Row label="0% - 5% Profit" value="4 pts" />
                    <Row label="Losses" value="1 pt" isLast />
                </Section>

                <View style={styles.gradeSection}>
                    <Text style={[styles.gradeTitle, { color: c.text }]}>Final Grade</Text>
                    <View style={styles.gradeRow}>
                        <View style={[styles.gradeChip, { backgroundColor: '#34C75922' }]}>
                            <Text style={[styles.gradeLabel, { color: '#34C759' }]}>EXCELLENT</Text>
                            <Text style={[styles.gradeRange, { color: '#34C759' }]}>80 - 100</Text>
                        </View>
                        <View style={[styles.gradeChip, { backgroundColor: '#5AC8FA22' }]}>
                            <Text style={[styles.gradeLabel, { color: '#5AC8FA' }]}>GOOD</Text>
                            <Text style={[styles.gradeRange, { color: '#5AC8FA' }]}>60 - 79</Text>
                        </View>
                        <View style={[styles.gradeChip, { backgroundColor: '#FF950022' }]}>
                            <Text style={[styles.gradeLabel, { color: '#FF9500' }]}>FAIR</Text>
                            <Text style={[styles.gradeRange, { color: '#FF9500' }]}>40 - 59</Text>
                        </View>
                        <View style={[styles.gradeChip, { backgroundColor: '#FF3B3022' }]}>
                            <Text style={[styles.gradeLabel, { color: '#FF3B30' }]}>POOR</Text>
                            <Text style={[styles.gradeRange, { color: '#FF3B30' }]}>0 - 39</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600'
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    scrollContent: { padding: 20, paddingBottom: 40 },
    introText: {
        fontSize: 13,
        lineHeight: 20,
        marginBottom: 24,
        paddingHorizontal: 4,
    },
    sectionCard: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 16,
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    titleBox: { flex: 1 },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600'
    },
    pointsText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: 2
    },
    sectionDivider: { height: 1, backgroundColor: 'rgba(120, 120, 128, 0.08)', marginBottom: 16 },
    description: {
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 16
    },
    formulaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
    },
    formulaLabel: {
        fontSize: 13,
        fontWeight: '400'
    },
    formulaValue: {
        fontSize: 13,
        fontWeight: '600'
    },
    subHeader: { marginTop: 12, marginBottom: 4 },
    subTitle: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        opacity: 0.6
    },
    gradeSection: { marginTop: 12, paddingHorizontal: 4 },
    gradeTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 16
    },
    gradeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    gradeChip: {
        width: '48%',
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
        gap: 4,
    },
    gradeLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1
    },
    gradeRange: {
        fontSize: 14,
        fontWeight: '600'
    },
});
