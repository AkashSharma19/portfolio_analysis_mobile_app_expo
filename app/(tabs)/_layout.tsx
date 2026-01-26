import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import React from 'react';
import { Platform, TouchableOpacity, View } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.5)',
          headerShown: false,
          tabBarShowLabel: true,
          tabBarStyle: {
            backgroundColor: '#000',
            height: Platform.OS === 'ios' ? 90 : 75,
            borderTopWidth: 0,
            elevation: 0,
            paddingBottom: Platform.OS === 'ios' ? 30 : 12,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '400',
            marginTop: 4,
            marginBottom: 4,
          }
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Portfolio',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "briefcase" : "briefcase-outline"} size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="analytics"
          options={{
            title: 'Analytics',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "pie-chart" : "pie-chart-outline"} size={22} color={color} />
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
              <Ionicons name={focused ? "time" : "time-outline"} size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} />
            ),
          }}
        />
      </Tabs>

      {/* Floating Action Button */}
      <TouchableOpacity
        onPress={() => router.push('/add-transaction')}
        activeOpacity={0.8}
        style={{
          position: 'absolute',
          right: 20,
          bottom: Platform.OS === 'ios' ? 100 : 85,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: '#007AFF',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Plus size={30} color="#FFF" strokeWidth={2} />
      </TouchableOpacity>
    </View>

  );
}
