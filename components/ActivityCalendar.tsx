import { Transaction } from '@/types';
import { format, parseISO } from 'date-fns';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';

interface ActivityCalendarProps {
    transactions: Transaction[];
}

import { usePortfolioStore } from '@/store/usePortfolioStore';

export const ActivityCalendar = ({ transactions }: ActivityCalendarProps) => {
    const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
    // Group transactions by date
    const dailyStats = useMemo(() => {
        const stats: Record<string, { buy: number; sell: number }> = {};

        transactions.forEach((t) => {
            const dateStr = format(parseISO(t.date), 'yyyy-MM-dd');
            if (!stats[dateStr]) {
                stats[dateStr] = { buy: 0, sell: 0 };
            }
            const value = t.quantity * t.price;
            if (t.type === 'BUY') {
                stats[dateStr].buy += value;
            } else {
                stats[dateStr].sell += value;
            }
        });

        return stats;
    }, [transactions]);

    const renderDay = (day: DateData & { state?: string | undefined }) => {
        const dateStr = day.dateString;
        const stat = dailyStats[dateStr];
        const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');

        // Skip rendering for days outside the month if needed, 
        // but react-native-calendars usually handles 'disabled' state visually.
        // We'll just render the content if it's a valid day object.
        if (!day) return <View />;

        const buyValue = stat?.buy || 0;
        const sellValue = stat?.sell || 0;

        return (
            <View style={styles.dayContainer}>
                {/* Top: Sell (Negative) */}
                <View style={styles.statContainer}>
                    {sellValue > 0 && (
                        <Text style={styles.sellText} numberOfLines={1}>
                            {isPrivacyMode ? '****' : `-${sellValue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`}
                        </Text>
                    )}
                </View>

                {/* Center: Date */}
                <Text style={[
                    styles.dayText,
                    isToday && styles.todayText,
                    day.state === 'disabled' && styles.disabledText
                ]}>
                    {day.day}
                </Text>

                {/* Bottom: Buy (Positive) */}
                <View style={styles.statContainer}>
                    {buyValue > 0 && (
                        <Text style={styles.buyText} numberOfLines={1}>
                            {isPrivacyMode ? '****' : `+${buyValue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`}
                        </Text>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>CALENDAR VIEW</Text>
            <Calendar
                dayComponent={({ date, state }: { date?: DateData; state?: string }) => {
                    if (!date) return <View />;
                    return renderDay({ ...date, state });
                }}
                theme={{
                    backgroundColor: '#1C1C1E',
                    calendarBackground: '#1C1C1E',
                    textSectionTitleColor: '#8E8E93',
                    selectedDayBackgroundColor: 'transparent',
                    selectedDayTextColor: '#ffffff',
                    todayTextColor: '#2ac4c7',
                    dayTextColor: '#ffffff',
                    textDisabledColor: '#444',
                    dotColor: '#00adf5',
                    selectedDotColor: '#ffffff',
                    arrowColor: '#8E8E93',
                    monthTextColor: '#8E8E93',
                    indicatorColor: 'white',
                    textDayFontWeight: '400',
                    textMonthFontWeight: '600',
                    textDayHeaderFontWeight: '600',
                    textDayFontSize: 14,
                    textMonthFontSize: 16,
                    textDayHeaderFontSize: 11,
                }}
                enableSwipeMonths={true}
                hideExtraDays={true}
                firstDay={1}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#1C1C1E',
        borderRadius: 24,
        padding: 16,
        paddingTop: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },

    dayContainer: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayText: {
        fontSize: 14,
        color: '#FFF',
        fontWeight: '500',
        marginBottom: 0,
    },
    todayText: {
        color: '#2ac4c7', // Cyan-ish for today
        fontWeight: '700',
    },
    disabledText: {
        color: '#444',
    },
    statContainer: {
        height: 10, // Fixed height to prevent jitter
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    sellText: {
        fontSize: 7,
        color: '#8E8E93', // Gray as requested for sells (or use Red #FF453A if preferred)
        textAlign: 'center',
    },
    buyText: {
        fontSize: 7,
        color: '#2ac4c7', // Cyan/Green for buys
        textAlign: 'center',
    },
    title: {
        color: '#8E8E93',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 12,
    },
});
