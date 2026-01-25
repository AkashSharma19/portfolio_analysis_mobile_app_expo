import { Text, View } from '@/components/Themed';
import { Transaction } from '@/types';
import { format, parseISO } from 'date-fns';
import React, { useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';

interface ActivityCalendarProps {
    transactions: Transaction[];
}

export const ActivityCalendar = ({ transactions }: ActivityCalendarProps) => {
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    const markedDates = useMemo(() => {
        const marks: any = {};

        transactions.forEach((t) => {
            const dateStr = format(parseISO(t.date), 'yyyy-MM-dd');
            if (!marks[dateStr]) {
                marks[dateStr] = { dots: [] };
            }

            const dotColor = t.type === 'BUY' ? '#4CAF50' : '#F44336';
            // Only add dot if not already present for this type on this day to avoid too many dots
            if (!marks[dateStr].dots.some((d: any) => d.color === dotColor)) {
                marks[dateStr].dots.push({ key: t.type, color: dotColor });
            }
        });

        if (selectedDate) {
            marks[selectedDate] = {
                ...marks[selectedDate],
                selected: true,
                selectedColor: '#007AFF'
            };
        }

        return marks;
    }, [transactions, selectedDate]);

    const dailySummary = useMemo(() => {
        const dayTransactions = transactions.filter(
            (t) => format(parseISO(t.date), 'yyyy-MM-dd') === selectedDate
        );

        let buyTotal = 0;
        let sellTotal = 0;

        dayTransactions.forEach((t) => {
            if (t.type === 'BUY') buyTotal += t.quantity * t.price;
            else sellTotal += t.quantity * t.price;
        });

        return { buyTotal, sellTotal, count: dayTransactions.length };
    }, [transactions, selectedDate]);

    return (
        <View style={styles.container}>
            <Calendar
                theme={{
                    backgroundColor: '#1C1C1E',
                    calendarBackground: '#1C1C1E',
                    textSectionTitleColor: '#b6c1cd',
                    selectedDayBackgroundColor: '#007AFF',
                    selectedDayTextColor: '#ffffff',
                    todayTextColor: '#007AFF',
                    dayTextColor: '#ffffff',
                    textDisabledColor: '#444',
                    dotColor: '#00adf5',
                    selectedDotColor: '#ffffff',
                    arrowColor: '#007AFF',
                    monthTextColor: '#ffffff',
                    indicatorColor: 'white',
                    textDayFontWeight: '300',
                    textMonthFontWeight: 'bold',
                    textDayHeaderFontWeight: '300',
                    textDayFontSize: 16,
                    textMonthFontSize: 18,
                    textDayHeaderFontSize: 14
                }}
                markingType={'multi-dot'}
                markedDates={markedDates}
                onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
            />

            <View style={styles.summaryBox}>
                <Text style={styles.summaryTitle}>
                    {format(parseISO(selectedDate), 'MMMM dd, yyyy')}
                </Text>
                <View style={styles.summaryRows}>
                    <View style={styles.row}>
                        <Text style={styles.rowLabel}>Daily Buy</Text>
                        <Text style={[styles.rowValue, { color: '#4CAF50' }]}>
                            ₹{dailySummary.buyTotal.toLocaleString()}
                        </Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.rowLabel}>Daily Sell</Text>
                        <Text style={[styles.rowValue, { color: '#F44336' }]}>
                            ${dailySummary.sellTotal.toLocaleString()}
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#1C1C1E',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 20,
    },
    summaryBox: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#333',
        backgroundColor: 'transparent',
    },
    summaryTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 12,
    },
    summaryRows: {
        backgroundColor: 'transparent',
        gap: 8,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: 'transparent',
    },
    rowLabel: {
        fontSize: 14,
        color: '#8E8E93',
    },
    rowValue: {
        fontSize: 14,
        fontWeight: '600',
    },
});
