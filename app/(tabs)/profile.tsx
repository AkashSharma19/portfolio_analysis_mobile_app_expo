import { usePortfolioStore } from '@/store/usePortfolioStore';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { StatusBar } from 'expo-status-bar';
import { ChevronRight, LogOut, User } from 'lucide-react-native';
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as XLSX from 'xlsx';

export default function ProfileScreen() {
    const router = useRouter();

    const { transactions, tickers } = usePortfolioStore();

    const handleExport = async () => {
        if (transactions.length === 0) {
            Alert.alert('No Data', 'There are no transactions to export.');
            return;
        }

        try {
            // Create a lookup map for tickers
            const tickerMap = new Map(tickers.map(t => [t.Tickers.toUpperCase(), t]));

            // Prepare data for Excel
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

            // Create worksheet and workbook
            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');

            // Generate base64 string
            const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });

            // File URI
            const filename = `Portfolio_Transactions_${new Date().toISOString().split('T')[0]}.xlsx`;
            const fileUri = `${FileSystem.cacheDirectory}${filename}`;

            // Write file
            await FileSystem.writeAsStringAsync(fileUri, wbout, {
                encoding: FileSystem.EncodingType.Base64,
            });

            // Share/Save file
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

    const menuItems = [
        {
            icon: <ChevronRight size={20} color="#007AFF" />,
            label: 'Export Transactions',
            sublabel: 'Download as Excel file',
            onPress: handleExport
        },
    ];

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
            <View style={styles.container}>
                <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />

                <View style={styles.header}>
                    <View style={styles.avatarContainer}>
                        <View style={styles.avatarPlaceholder}>
                            <User size={40} color="#FFF" />
                        </View>
                    </View>
                    <Text style={styles.name}>Akash Sharma</Text>
                    <Text style={styles.email}>akash@example.com</Text>
                </View>

                <View style={styles.menuContainer}>
                    {menuItems.map((item, index) => (
                        <TouchableOpacity key={index} style={styles.menuItem} onPress={item.onPress}>
                            <View style={styles.menuIconContainer}>
                                {item.icon}
                            </View>
                            <View style={styles.menuTextContainer}>
                                <Text style={styles.menuLabel}>{item.label}</Text>
                                <Text style={styles.menuSublabel}>{item.sublabel}</Text>
                            </View>
                            <ChevronRight size={18} color="#38383A" />
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity style={styles.logoutButton}>
                    <LogOut size={20} color="#FF3B30" />
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>

                <Text style={styles.version}>Version 1.0.0</Text>
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
        padding: 20,
        paddingBottom: 20,
    },
    header: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 40,
        backgroundColor: 'transparent',
    },
    avatarContainer: {
        marginBottom: 16,
        backgroundColor: 'transparent',
    },
    avatarPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#1C1C1E',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333',
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 4,
    },
    email: {
        fontSize: 14,
        color: '#8E8E93',
    },
    menuContainer: {
        backgroundColor: '#1C1C1E',
        borderRadius: 16,
        paddingVertical: 8,
        marginBottom: 30,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#2C2C2E',
    },
    menuIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    menuTextContainer: {
        flex: 1,
    },
    menuLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
        marginBottom: 2,
    },
    menuSublabel: {
        fontSize: 12,
        color: '#8E8E93',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1C1C1E',
        borderRadius: 16,
        padding: 16,
        marginTop: 'auto',
        marginBottom: 20,
    },
    logoutText: {
        color: '#FF3B30',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    version: {
        textAlign: 'center',
        color: '#38383A',
        fontSize: 12,
        marginBottom: 20,
    },
});
