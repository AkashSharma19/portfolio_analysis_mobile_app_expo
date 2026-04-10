import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { getSectorIcon } from '@/constants/Icons';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import { BackButton } from '@/components/BackButton';
import React, { useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SectorsScreen() {
  const tickers = usePortfolioStore((state) => state.tickers);
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  const [searchQuery, setSearchQuery] = useState('');

  const uniqueSectors = useMemo(() => {
    const sectors = new Set<string>(
      tickers.map((t) => t['Sector']).filter((t): t is string => !!t),
    );
    const sorted = Array.from(sectors).sort();

    if (!searchQuery) return sorted;

    const query = searchQuery.toLowerCase();
    return sorted.filter((s) => s.toLowerCase().includes(query));
  }, [tickers, searchQuery]);

  const renderSectorItem = ({ item: sName }: { item: string }) => {
    const { icon: SectorIcon, color } = getSectorIcon(sName);
    return (
      <TouchableOpacity
        style={[
          styles.sectorListItem,
          { borderBottomColor: currColors.border },
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(`/sector-details/${encodeURIComponent(sName)}`);
        }}
      >
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <SectorIcon size={20} color={color} />
        </View>
        <Text style={[styles.sectorName, { color: currColors.text }]}>
          {sName}
        </Text>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={currColors.textSecondary}
        />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: currColors.background }]}
      edges={['top', 'left', 'right']}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { backgroundColor: currColors.background }]}>
        <BackButton />
        <Text style={[styles.headerTitle, { color: currColors.text }]}>
          All Sectors
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: currColors.card }]}>
          <Ionicons
            name="search"
            size={20}
            color={currColors.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            style={[styles.searchInput, { color: currColors.text }]}
            placeholder="Search sectors..."
            placeholderTextColor={currColors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons
                name="close-circle"
                size={20}
                color={currColors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={uniqueSectors}
        renderItem={renderSectorItem}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text
              style={[styles.emptyText, { color: currColors.textSecondary }]}
            >
              No sectors found
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'Outfit_600SemiBold',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
    fontFamily: 'Outfit_400Regular',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  sectorListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  sectorName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Outfit_500Medium',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Outfit_400Regular',
  },
});
