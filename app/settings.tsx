import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Moon, Smartphone, Sun } from 'lucide-react-native';
import React from 'react';
import { Platform, SafeAreaView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

export default function SettingsScreen() {
    const router = useRouter();
    const theme = usePortfolioStore((state) => state.theme);
    const setTheme = usePortfolioStore((state) => state.setTheme);
    const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);
    const toggleCurrencySymbol = usePortfolioStore((state) => state.toggleCurrencySymbol);

    const colorScheme = useColorScheme() ?? 'dark';
    const currColors = Colors[colorScheme];

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: currColors.background }]}>
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
            <View style={styles.container}>
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
                    <Text style={[styles.headerTitle, { color: currColors.text }]}>Settings</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.content}>
                    <View style={[styles.section, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
                        <View style={styles.settingRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.settingTitle, { color: currColors.text }]}>Appearance</Text>
                                <Text style={[styles.settingDescription, { color: currColors.textSecondary }]}>
                                    Choose how the app looks to you
                                </Text>
                            </View>
                        </View>

                        <View style={[styles.themeSelector, { backgroundColor: currColors.cardSecondary }]}>
                            <TouchableOpacity
                                style={[styles.themeOption, theme === 'light' && { backgroundColor: currColors.card, borderColor: currColors.border, borderWidth: 1 }]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setTheme('light');
                                }}
                            >
                                <Sun size={16} color={theme === 'light' ? currColors.tint : currColors.textSecondary} />
                                <Text style={[styles.themeText, { color: theme === 'light' ? currColors.text : currColors.textSecondary }]}>Light</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.themeOption, theme === 'dark' && { backgroundColor: currColors.card, borderColor: currColors.border, borderWidth: 1 }]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setTheme('dark');
                                }}
                            >
                                <Moon size={16} color={theme === 'dark' ? currColors.tint : currColors.textSecondary} />
                                <Text style={[styles.themeText, { color: theme === 'dark' ? currColors.text : currColors.textSecondary }]}>Dark</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.themeOption, theme === 'system' && { backgroundColor: currColors.card, borderColor: currColors.border, borderWidth: 1 }]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setTheme('system');
                                }}
                            >
                                <Smartphone size={16} color={theme === 'system' ? currColors.tint : currColors.textSecondary} />
                                <Text style={[styles.themeText, { color: theme === 'system' ? currColors.text : currColors.textSecondary }]}>System</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={[styles.separator, { backgroundColor: currColors.border }]} />

                        <View style={styles.settingRow}>
                            <View>
                                <Text style={[styles.settingTitle, { color: currColors.text }]}>Show Currency Symbol</Text>
                                <Text style={[styles.settingDescription, { color: currColors.textSecondary }]}>
                                    Display symbols like ₹ in portfolios
                                </Text>
                            </View>
                            <Switch
                                value={showCurrencySymbol}
                                onValueChange={toggleCurrencySymbol}
                                trackColor={{ false: '#767577', true: '#007AFF' }}
                                thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : showCurrencySymbol ? '#FFFFFF' : '#f4f3f4'}
                            />
                        </View>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    container: {
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
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    section: {
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    settingTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    settingDescription: {
        fontSize: 11,
    },
    separator: {
        height: 1,
        marginVertical: 16,
    },
    themeSelector: {
        flexDirection: 'row',
        borderRadius: 12,
        padding: 4,
        marginTop: 16,
        gap: 4,
    },
    themeOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 8,
        gap: 8,
    },
    themeText: {
        fontSize: 12,
        fontWeight: '500',
    },
});
