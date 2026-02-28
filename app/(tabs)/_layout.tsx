// import { Ionicons } from '@expo/vector-icons';
import { useInsights } from '@/hooks/useInsights';
import * as Haptics from 'expo-haptics';
import { Tabs, useRouter } from 'expo-router';
import { Compass, History, Plus, Sparkles, User, Wallet } from 'lucide-react-native';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

function InsightsTabIcon({ color, focused }: { color: string; focused: boolean }) {
  const { count } = useInsights();
  const badgeCount = Math.min(count, 9);
  const showBadge = count > 0;

  return (
    <View style={tabStyles.iconWrapper}>
      <Sparkles size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
      {showBadge && (
        <View style={tabStyles.badge}>
          <Text style={tabStyles.badgeText}>{badgeCount}{count > 9 ? '+' : ''}</Text>
        </View>
      )}
    </View>
  );
}

const tabStyles = StyleSheet.create({
  iconWrapper: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 11,
  },
});

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];
  const router = useRouter();

  const handleHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={{ flex: 1, backgroundColor: currColors.background }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: currColors.textSecondary,
          headerShown: false,
          tabBarShowLabel: true,
          tabBarButton: (props) => {
            const { delayLongPress, ...rest } = props as any;
            return (
              <TouchableOpacity
                {...rest}
                delayLongPress={delayLongPress ?? undefined}
                activeOpacity={0.7}
                onPress={(e) => {
                  handleHaptic();
                  props.onPress?.(e);
                }}
              />
            );
          },
          tabBarStyle: {
            backgroundColor: currColors.background,
            height: Platform.OS === 'ios' ? 92 : 78,
            borderTopWidth: 1,
            borderTopColor: currColors.border,
            elevation: 0,
            paddingBottom: Platform.OS === 'ios' ? 32 : 12,
            paddingTop: 10,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '500',
            marginTop: 4,
            marginBottom: 2,
          }
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Portfolio',
            tabBarIcon: ({ color, focused }) => (
              <Wallet size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
            ),
          }}
        />

        <Tabs.Screen
          name="insights"
          options={{
            title: 'Insights',
            tabBarIcon: ({ color, focused }) => (
              <InsightsTabIcon color={color} focused={focused} />
            ),
          }}
        />

        <Tabs.Screen
          name="add"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="two"
          options={{
            title: 'History',
            tabBarIcon: ({ color, focused }) => (
              <History size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
            ),
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Explore',
            tabBarIcon: ({ color, focused }) => (
              <Compass size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused }) => (
              <User size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
            ),
          }}
        />
      </Tabs>

      {/* Floating Action Button */}
      <TouchableOpacity
        onPress={() => {
          handleHaptic();
          router.push('/add-transaction');
        }}
        activeOpacity={0.8}
        style={{
          position: 'absolute',
          right: 16,
          bottom: Platform.OS === 'ios' ? 100 : 85,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: '#007AFF',
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 4.65,
          elevation: 8,
        }}
      >
        <Plus size={30} color="#FFF" strokeWidth={2} />
      </TouchableOpacity>
    </View>

  );
}
