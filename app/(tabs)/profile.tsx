import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { StatusBar } from 'expo-status-bar';
import { ChevronRight, Database, Download, Edit2, FileText, Mail, Phone, Upload, User, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as XLSX from 'xlsx';

export default function ProfileScreen() {
    const router = useRouter();
    const transactions = usePortfolioStore((state) => state.transactions);
    const tickers = usePortfolioStore((state) => state.tickers);
    const importTransactions = usePortfolioStore((state) => state.importTransactions);
    const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
    const calculateSummary = usePortfolioStore((state) => state.calculateSummary);
    const userName = usePortfolioStore((state) => state.userName);
    const userEmail = usePortfolioStore((state) => state.userEmail);
    const userMobile = usePortfolioStore((state) => state.userMobile);
    const userImage = usePortfolioStore((state) => state.userImage);
    const updateProfile = usePortfolioStore((state) => state.updateProfile);
    const theme = usePortfolioStore((state) => state.theme);
    const setTheme = usePortfolioStore((state) => state.setTheme);
    const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);

    const colorScheme = useColorScheme() ?? 'dark';
    const currColors = Colors[colorScheme];

    const [isEditModalVisible, setIsEditModalVisible] = useState(false);

    // Modal Edit State
    const [editName, setEditName] = useState(userName);
    const [editEmail, setEditEmail] = useState(userEmail);
    const [editMobile, setEditMobile] = useState(userMobile);

    const summary = useMemo(() => calculateSummary(), [transactions, tickers, calculateSummary]);

    const handleOpenEditModal = () => {
        setEditName(userName);
        setEditEmail(userEmail);
        setEditMobile(userMobile);
        setIsEditModalVisible(true);
    };

    const handlePickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'We need access to your gallery to change your profile picture.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            updateProfile({ image: result.assets[0].uri });
        }
    };

    const handleSaveProfile = () => {
        if (!editName.trim()) {
            Alert.alert('Error', 'Name cannot be empty.');
            return;
        }
        updateProfile({
            name: editName.trim(),
            email: editEmail.trim(),
            mobile: editMobile.trim()
        });
        setIsEditModalVisible(false);
    };

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

    const handleBackup = async () => {
        if (transactions.length === 0) {
            Alert.alert('No Data', 'There are no transactions to backup.');
            return;
        }

        try {
            // Map to the simple Sample format
            const backupData = transactions.map(t => ({
                Symbol: t.symbol,
                Quantity: t.quantity,
                Price: t.price,
                Date: t.date,
                Type: t.type,
                Broker: t.broker || '',
                Currency: t.currency
            }));

            const worksheet = XLSX.utils.json_to_sheet(backupData);
            const csvOutput = XLSX.utils.sheet_to_csv(worksheet);

            const filename = `Gainbase_Backup_${new Date().toISOString().split('T')[0]}.csv`;
            const fileUri = `${FileSystem.cacheDirectory}${filename}`;

            await FileSystem.writeAsStringAsync(fileUri, csvOutput, {
                encoding: FileSystem.EncodingType.UTF8,
            });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri, {
                    mimeType: 'text/csv',
                    dialogTitle: 'Backup Transactions',
                    UTI: 'public.comma-separated-values-text',
                });
            } else {
                Alert.alert('Sharing not available', 'Sharing is not available on this device.');
            }
        } catch (error) {
            console.error('Backup Error:', error);
            Alert.alert('Backup Failed', 'An error occurred while creating the backup.');
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
                type: [
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'application/vnd.ms-excel',
                    'text/csv',
                    'text/comma-separated-values',
                    'application/csv'
                ],
                copyToCacheDirectory: true
            });

            if (result.canceled) return;

            const fileUri = result.assets[0].uri;
            const fileName = result.assets[0].name.toLowerCase();
            const isCsv = fileName.endsWith('.csv');

            let jsonData;

            if (isCsv) {
                const fileContent = await FileSystem.readAsStringAsync(fileUri, {
                    encoding: FileSystem.EncodingType.UTF8
                });
                const workbook = XLSX.read(fileContent, { type: 'string' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                jsonData = XLSX.utils.sheet_to_json(worksheet);
            } else {
                const fileContent = await FileSystem.readAsStringAsync(fileUri, {
                    encoding: FileSystem.EncodingType.Base64
                });
                const workbook = XLSX.read(fileContent, { type: 'base64' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                jsonData = XLSX.utils.sheet_to_json(worksheet);
            }

            if (!jsonData || jsonData.length === 0) {
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
                Alert.alert('Error', 'No valid transactions found in the file. Please use the Sample format.');
            }

        } catch (error) {
            console.error('Import Error:', error);
            Alert.alert('Import Failed', 'Ensure the file matches the sample format.');
        }
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: currColors.background }]} edges={['top', 'left', 'right']}>
            <View style={[styles.container, { backgroundColor: currColors.background }]}>


                <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                    overScrollMode="never"
                >
                    {/* Consolidated User Info & Stats Box */}
                    <View style={[styles.userInfoContainer, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
                        <View style={styles.profileRow}>
                            <View style={[styles.avatarContainer, { backgroundColor: currColors.card }]}>
                                <Image
                                    source={{ uri: userImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userName || 'User'}` }}
                                    style={styles.avatar}
                                />
                            </View>
                            <View style={styles.nameContainer}>
                                <Text style={[styles.nameText, { color: currColors.text }]}>{userName || 'Set up your profile'}</Text>
                                {userEmail ? (
                                    <Text style={[styles.emailText, { color: currColors.textSecondary }]} numberOfLines={1}>{userEmail}</Text>
                                ) : (
                                    <Text style={[styles.emailText, { color: currColors.textSecondary }]}>Tap the edit icon to get started</Text>
                                )}
                            </View>
                            <TouchableOpacity style={[styles.mainEditIcon, { backgroundColor: currColors.cardSecondary }]} onPress={handleOpenEditModal}>
                                <Edit2 size={20} color={currColors.tint} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.statsBar}>
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: currColors.text }]}>{isPrivacyMode ? '****' : transactions.length}</Text>
                                <Text style={[styles.statLabel, { color: currColors.textSecondary }]}>Transactions</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: currColors.text }]}>
                                    {isPrivacyMode ? '****' : `${showCurrencySymbol ? '₹' : ''}${summary.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0, notation: "compact", compactDisplay: "short" })}`}
                                </Text>
                                <Text style={[styles.statLabel, { color: currColors.textSecondary }]}>Net assets</Text>
                            </View>
                        </View>
                    </View>

                    {/* Action Grid */}
                    <View style={[styles.actionGridContainer, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
                        <View style={styles.gridRow}>
                            <TouchableOpacity style={styles.gridButton} onPress={handleDownloadSample}>
                                <View style={[styles.gridIconBox, { backgroundColor: currColors.cardSecondary }]}>
                                    <FileText size={24} color={currColors.tint} />
                                </View>
                                <Text style={[styles.gridLabel, { color: currColors.text }]}>Sample</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.gridButton} onPress={handleImport}>
                                <View style={[styles.gridIconBox, { backgroundColor: currColors.cardSecondary }]}>
                                    <Upload size={24} color={currColors.tint} />
                                </View>
                                <Text style={[styles.gridLabel, { color: currColors.text }]}>Import</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.gridButton} onPress={handleBackup}>
                                <View style={[styles.gridIconBox, { backgroundColor: currColors.cardSecondary }]}>
                                    <Database size={24} color={currColors.tint} />
                                </View>
                                <Text style={[styles.gridLabel, { color: currColors.text }]}>Backup</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.gridButton} onPress={handleExport}>
                                <View style={[styles.gridIconBox, { backgroundColor: currColors.cardSecondary }]}>
                                    <Download size={24} color={currColors.tint} />
                                </View>
                                <Text style={[styles.gridLabel, { color: currColors.text }]}>Export</Text>
                            </TouchableOpacity>
                        </View>
                    </View>


                    {/* Settings Action */}
                    <TouchableOpacity
                        style={[styles.settingsCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}
                        onPress={() => router.push('/settings')}
                        activeOpacity={0.7}
                    >
                        <View style={styles.settingsLeft}>
                            <Text style={[styles.settingsLabel, { color: currColors.text }]}>Settings</Text>
                        </View>
                        <ChevronRight size={20} color={currColors.textSecondary} />
                    </TouchableOpacity>
                </ScrollView>

                {/* Edit Profile Modal */}
                <Modal
                    visible={isEditModalVisible}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setIsEditModalVisible(false)}
                >
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={[styles.modalOverlay, { backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.4)' }]}
                    >
                        <View style={[styles.modalContent, { backgroundColor: currColors.card }]}>
                            <View style={[styles.modalHeader, { borderBottomColor: currColors.border }]}>
                                <Text style={[styles.modalTitle, { color: currColors.text }]}>Edit Profile</Text>
                                <TouchableOpacity onPress={() => setIsEditModalVisible(false)} style={styles.closeButton}>
                                    <X size={24} color={currColors.text} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.modalBody}>
                                <TouchableOpacity style={styles.modalAvatarContainer} onPress={handlePickImage}>
                                    <Image
                                        source={{ uri: userImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userName || 'User'}` }}
                                        style={styles.modalAvatar}
                                    />
                                    <View style={styles.editImageOverlay}>
                                        <Edit2 size={16} color="#FFF" />
                                    </View>
                                </TouchableOpacity>

                                <View style={[styles.inputGroup, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
                                    <View style={styles.inputIcon}>
                                        <User size={20} color={currColors.textSecondary} />
                                    </View>
                                    <TextInput
                                        style={[styles.modalInput, { color: currColors.text }]}
                                        value={editName}
                                        onChangeText={setEditName}
                                        placeholder="Name"
                                        placeholderTextColor={currColors.textSecondary}
                                    />
                                </View>

                                <View style={[styles.inputGroup, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
                                    <View style={styles.inputIcon}>
                                        <Mail size={20} color={currColors.textSecondary} />
                                    </View>
                                    <TextInput
                                        style={[styles.modalInput, { color: currColors.text }]}
                                        value={editEmail}
                                        onChangeText={setEditEmail}
                                        placeholder="Email"
                                        placeholderTextColor={currColors.textSecondary}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                    />
                                </View>

                                <View style={[styles.inputGroup, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
                                    <View style={styles.inputIcon}>
                                        <Phone size={20} color={currColors.textSecondary} />
                                    </View>
                                    <TextInput
                                        style={[styles.modalInput, { color: currColors.text }]}
                                        value={editMobile}
                                        onChangeText={setEditMobile}
                                        placeholder="Mobile"
                                        placeholderTextColor={currColors.textSecondary}
                                        keyboardType="phone-pad"
                                    />
                                </View>

                                <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
                                    <Text style={styles.saveButtonText}>Save Changes</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </Modal>

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
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    headerText: {
        fontSize: 28,
        fontWeight: '600',
        color: '#FFF',
    },
    headerIcons: {
        flexDirection: 'row',
        gap: 15,
    },
    headerIconButton: {
        padding: 4,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    userInfoContainer: {
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
        paddingHorizontal: 4,
    },
    avatarContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        overflow: 'hidden',
        marginRight: 16,
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    nameContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    nameText: {
        fontSize: 20,
        fontWeight: '600',
        color: '#FFF',
    },
    emailText: {
        fontSize: 14,
        color: '#8E8E93',
        marginTop: 2,
    },
    mainEditIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statsBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 10,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFF',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#8E8E93',
    },
    actionGridContainer: {
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
    },
    gridRow: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        gap: 16,
    },
    gridButton: {
        alignItems: 'center',
        width: 70,
    },
    gridIconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    gridLabel: {
        fontSize: 12,
        color: '#FFF',
        fontWeight: '400',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        borderBottomWidth: 1,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#FFF',
    },
    closeButton: {
        padding: 4,
    },
    modalBody: {
        padding: 24,
        alignItems: 'center',
    },
    modalAvatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 30,
        position: 'relative',
    },
    modalAvatar: {
        width: '100%',
        height: '100%',
        borderRadius: 50,
    },
    editImageOverlay: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#007AFF',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#1C1C1E',
    },
    inputGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        marginBottom: 16,
        width: '100%',
        paddingHorizontal: 16,
        height: 56,
        borderWidth: 1,
    },
    inputIcon: {
        marginRight: 12,
    },
    modalInput: {
        flex: 1,
        color: '#FFF',
        fontSize: 16,
    },
    saveButton: {
        backgroundColor: '#007AFF',
        borderRadius: 12,
        height: 56,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
    },
    saveButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    settingsCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 24,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
    },
    settingsLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    settingsLabel: {
        fontSize: 16,
        fontWeight: '500',
    },
});
