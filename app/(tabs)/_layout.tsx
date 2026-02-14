// import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Tabs, useRouter } from 'expo-router';
import { Compass, History, Plus, Sparkles, User, Wallet } from 'lucide-react-native';
import React from 'react';
import { Platform, TouchableOpacity, View } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

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
              <Sparkles size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
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
