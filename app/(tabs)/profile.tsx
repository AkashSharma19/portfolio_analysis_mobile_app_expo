import { usePortfolioStore } from '@/store/usePortfolioStore';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { StatusBar } from 'expo-status-bar';
import { ChevronRight, Download, LogOut, ShieldCheck, Upload } from 'lucide-react-native';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as XLSX from 'xlsx';

export default function ProfileScreen() {
    const router = useRouter();
    const { transactions, tickers, importTransactions, isPrivacyMode } = usePortfolioStore();

    const handleExport = async () => {
        if (transactions.length === 0) {
            Alert.alert('No Data', 'There are no transactions to export.');
            return;
        }

        try {
            const tickerMap = new Map(tickers.map(t => [t.Tickers.toUpperCase(), t]));
            const exportData = transactions.map(t => {
                const ticker = tickerMap.get(t.symbol.toUpperCase());
                return {
                    Symbol: t.symbol,
                    'Company Name': ticker?.['Company Name'] || '-',
                    'Asset Type': ticker?.['Asset Type'] || '-',
                    'Sector': ticker?.['Sector'] || '-',
                    Quantity: t.quantity,
                    Price: t.price,
                    Date: t.date,
                    Type: t.type,
                    Broker: t.broker || '-',
                    Currency: t.currency
                };
            });

            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');

            const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
            const filename = `Portfolio_Transactions_${new Date().toISOString().split('T')[0]}.xlsx`;
            const fileUri = `${FileSystem.cacheDirectory}${filename}`;

            await FileSystem.writeAsStringAsync(fileUri, wbout, {
                encoding: FileSystem.EncodingType.Base64,
            });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri, {
                    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    dialogTitle: 'Export Transactions',
                    UTI: 'com.microsoft.excel.xlsx',
                });
            } else {
                Alert.alert('Sharing not available', 'Sharing is not available on this device.');
            }
        } catch (error) {
            console.error('Export Error:', error);
            Alert.alert('Export Failed', 'An error occurred while exporting transactions.');
        }
    };

    const handleDownloadSample = async () => {
        try {
            const sampleData = [
                {
                    Symbol: 'RELIANCE',
                    Quantity: 10,
                    Price: 2400.50,
                    Date: '2023-01-15',
                    Type: 'BUY',
                    Broker: 'Zerodha',
                    Currency: 'INR'
                },
                {
                    Symbol: 'TCS',
                    Quantity: 5,
                    Price: 3200.00,
                    Date: '2023-02-20',
                    Type: 'SELL',
                    Broker: 'Upstox',
                    Currency: 'INR'
                }
            ];

            const worksheet = XLSX.utils.json_to_sheet(sampleData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');

            const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
            const filename = `Portfolio_Sample_Template.xlsx`;
            const fileUri = `${FileSystem.cacheDirectory}${filename}`;

            await FileSystem.writeAsStringAsync(fileUri, wbout, {
                encoding: FileSystem.EncodingType.Base64,
            });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri, {
                    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    dialogTitle: 'Download Sample Template',
                    UTI: 'com.microsoft.excel.xlsx',
                });
            } else {
                Alert.alert('Sharing not available', 'Sharing is not available on this device.');
            }
        } catch (error) {
            console.error('Sample Download Error:', error);
            Alert.alert('Error', 'Failed to generate sample file.');
        }
    };

    const handleImport = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'],
                copyToCacheDirectory: true
            });

            if (result.canceled) return;

            const fileUri = result.assets[0].uri;
            const fileContent = await FileSystem.readAsStringAsync(fileUri, {
                encoding: FileSystem.EncodingType.Base64
            });

            const workbook = XLSX.read(fileContent, { type: 'base64' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            if (jsonData.length === 0) {
                Alert.alert('Empty File', 'The imported file contains no data.');
                return;
            }

            const newTransactions = jsonData.map((row: any) => ({
                id: Math.random().toString(36).substr(2, 9),
                symbol: row.Symbol || row.symbol || '',
                quantity: Number(row.Quantity || row.quantity || 0),
                price: Number(row.Price || row.price || 0),
                date: row.Date || row.date || new Date().toISOString(),
                type: (row.Type?.toUpperCase() === 'SELL' ? 'SELL' : 'BUY') as 'BUY' | 'SELL',
                currency: row.Currency || row.currency || 'INR',
                broker: row.Broker || row.broker || ''
            })).filter(t => t.symbol && t.quantity > 0 && t.price >= 0);

            if (newTransactions.length > 0) {
                importTransactions(newTransactions);
                Alert.alert('Success', `Successfully imported ${newTransactions.length} transactions.`);
            } else {
                Alert.alert('Error', 'No valid transactions found in the file.');
            }

        } catch (error) {
            console.error('Import Error:', error);
            Alert.alert('Import Failed', 'Ensure the file matches the sample format.');
        }
    };

    const menuItems = [
        {
            icon: <Download size={20} color="#34C759" />,
            iconBg: 'rgba(52, 199, 89, 0.15)',
            label: 'Download Template',
            sublabel: 'Get Excel structure',
            onPress: handleDownloadSample
        },
        {
            icon: <Upload size={20} color="#FF9500" />,
            iconBg: 'rgba(255, 149, 0, 0.15)',
            label: 'Import Transactions',
            sublabel: 'Upload Excel file',
            onPress: handleImport
        },
        {
            icon: <ShieldCheck size={20} color="#007AFF" />,
            iconBg: 'rgba(0, 122, 255, 0.15)',
            label: 'Export Data',
            sublabel: 'Backup your portfolio',
            onPress: handleExport
        }
    ];

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
            <View style={styles.container}>
                <StatusBar style="light" />

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* Hero Section */}
                    <View style={styles.heroContainer}>
                        <LinearGradient
                            colors={['#1C1C1E', '#000']}
                            style={styles.heroGradient}
                        >
                            <View style={styles.avatarContainer}>
                                <LinearGradient
                                    colors={['#007AFF', '#5856D6']}
                                    style={styles.avatarBorder}
                                >
                                    <View style={styles.avatarInner}>
                                        <Text style={styles.avatarText}>AS</Text>
                                    </View>
                                </LinearGradient>
                                <View style={styles.proBadge}>
                                    <Text style={styles.proText}>PRO</Text>
                                </View>
                            </View>

                            <Text style={styles.name}>Akash Sharma</Text>
                            <Text style={styles.email}>akash@example.com</Text>

                            <View style={styles.statsRow}>
                                <View style={styles.statItem}>
                                    <Text style={styles.statValue}>{isPrivacyMode ? '****' : transactions.length}</Text>
                                    <Text style={styles.statLabel}>Transactions</Text>
                                </View>
                                <View style={styles.statDivider} />
                                <View style={styles.statItem}>
                                    <Text style={styles.statValue}>{isPrivacyMode ? '****' : tickers.length}</Text>
                                    <Text style={styles.statLabel}>Holdings</Text>
                                </View>
                            </View>
                        </LinearGradient>
                    </View>

                    {/* Data Management Section */}
                    <Text style={styles.sectionTitle}>Data Management</Text>
                    <View style={styles.menuGroup}>
                        {menuItems.map((item, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[styles.menuItem, index === menuItems.length - 1 && styles.menuItemLast]}
                                onPress={item.onPress}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.iconBox, { backgroundColor: item.iconBg }]}>
                                    {item.icon}
                                </View>
                                <View style={styles.menuTextContainer}>
                                    <Text style={styles.menuLabel}>{item.label}</Text>
                                    {item.sublabel && <Text style={styles.menuSublabel}>{item.sublabel}</Text>}
                                </View>
                                <ChevronRight size={18} color="#555" />
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Logout Button */}
                    <TouchableOpacity style={styles.logoutButton} activeOpacity={0.8}>
                        <LogOut size={20} color="#FF453A" />
                        <Text style={styles.logoutText}>Log Out</Text>
                    </TouchableOpacity>

                    <Text style={styles.versionText}>v1.0.0 • Build 2024</Text>
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#000',
    },
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    scrollContent: {
        padding: 20,
    },
    heroContainer: {
        marginBottom: 32,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#1C1C1E',
    },
    heroGradient: {
        padding: 24,
        alignItems: 'center',
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    avatarBorder: {
        width: 84,
        height: 84,
        borderRadius: 42,
        padding: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInner: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#151515',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 28,
        fontWeight: '700',
        color: '#FFF',
    },
    proBadge: {
        position: 'absolute',
        bottom: -6,
        alignSelf: 'center',
        backgroundColor: '#007AFF',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#000',
    },
    proText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '800',
    },
    name: {
        fontSize: 22,
        fontWeight: '700',
        color: '#FFF',
        marginBottom: 4,
    },
    email: {
        fontSize: 13,
        color: '#8E8E93',
        marginBottom: 20,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 24,
        width: '100%',
        justifyContent: 'space-around',
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFF',
    },
    statLabel: {
        fontSize: 11,
        color: '#8E8E93',
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 24,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#8E8E93',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginLeft: 12,
        marginBottom: 8,
    },
    menuGroup: {
        backgroundColor: '#1C1C1E',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 32,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#2C2C2E',
    },
    menuItemLast: {
        borderBottomWidth: 0,
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    menuTextContainer: {
        flex: 1,
    },
    menuLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: '#FFF',
        marginBottom: 2,
    },
    menuSublabel: {
        fontSize: 12,
        color: '#666',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1C1C1E',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 69, 58, 0.2)',
    },
    logoutText: {
        color: '#FF453A',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    versionText: {
        textAlign: 'center',
        color: '#333',
        fontSize: 11,
        marginTop: 24,
        marginBottom: 10,
    }
});
