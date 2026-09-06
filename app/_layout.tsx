import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from 'expo-router/react-navigation';
import {
  useFonts,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { registerBackgroundFetchAsync } from '../tasks/backgroundFetch';
import { useMoneyStore } from '../store/useMoneyStore';
import { usePortfolioStore } from '../store/usePortfolioStore';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/add-transaction` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
      if (Platform.OS !== 'web') {
        registerBackgroundFetchAsync();
      }

      // Check if both local stores have hydrated before running the sync
      const checkHydrationAndSync = async () => {
        const moneyHydrated = useMoneyStore.persist.hasHydrated();
        const portfolioHydrated = usePortfolioStore.persist.hasHydrated();

        if (moneyHydrated && portfolioHydrated) {
          try {
            const { syncAllData } = await import('../utils/syncEngine');
            syncAllData().catch((err) => console.error('Auto sync error:', err));
          } catch (e) {
            console.error('Failed to import syncEngine:', e);
          }
        } else {
          setTimeout(checkHydrationAndSync, 100);
        }
      };

      checkHydrationAndSync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  const theme = {
    ...(colorScheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(colorScheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: currColors.background,
      card: currColors.card,
    },
  };

  const backgroundColor = currColors.background;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor }}>
      <ThemeProvider value={theme}>
        <StatusBar style={colorScheme === 'light' ? 'dark' : 'light'} />
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor },
            headerStyle: { backgroundColor },
            headerTintColor: currColors.text,
            headerTitleStyle: {
              fontFamily: 'Outfit_600SemiBold',
              fontSize: 17,
            },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="add-transaction"
            options={{ presentation: 'modal', headerShown: false }}
          />
          <Stack.Screen
            name="monthly-analysis"
            options={{ animation: 'slide_from_right', headerShown: false }}
          />
          <Stack.Screen
            name="yearly-analysis"
            options={{ animation: 'slide_from_right', headerShown: false }}
          />
          <Stack.Screen
            name="stock-details/[symbol]"
            options={{ animation: 'slide_from_right', headerShown: false }}
          />
          <Stack.Screen
            name="analytics"
            options={{ animation: 'slide_from_right', headerShown: false }}
          />
          <Stack.Screen
            name="forecast-details"
            options={{ animation: 'slide_from_right', headerShown: false }}
          />
          <Stack.Screen
            name="win-loss-details"
            options={{ animation: 'slide_from_right', headerShown: false }}
          />
          <Stack.Screen
            name="settings"
            options={{ animation: 'slide_from_right', headerShown: false }}
          />

          <Stack.Screen
            name="index-comparison"
            options={{ animation: 'slide_from_right', headerShown: false }}
          />
          <Stack.Screen
            name="portfolio-health"
            options={{ animation: 'slide_from_right', headerShown: false }}
          />
          <Stack.Screen
            name="portfolio-health-formula"
            options={{ animation: 'slide_from_right', headerShown: false }}
          />
          <Stack.Screen
            name="sectors"
            options={{ animation: 'slide_from_right', headerShown: true }}
          />
          <Stack.Screen
            name="sector-details/[sector]"
            options={{ animation: 'slide_from_right', headerShown: false }}
          />
          <Stack.Screen
            name="add-account"
            options={{ presentation: 'modal', headerShown: false }}
          />
          <Stack.Screen
            name="account-details/[id]"
            options={{ animation: 'slide_from_right', headerShown: false }}
          />
          <Stack.Screen
            name="add-money-transaction"
            options={{ presentation: 'modal', headerShown: false }}
          />
          <Stack.Screen
            name="all-money-transactions"
            options={{ animation: 'slide_from_right', headerShown: false }}
          />
          <Stack.Screen
            name="loan-details/[id]"
            options={{ animation: 'slide_from_right', headerShown: false }}
          />
          <Stack.Screen
            name="add-loan"
            options={{ presentation: 'modal', headerShown: false }}
          />
          <Stack.Screen
            name="add-subscription"
            options={{ presentation: 'modal', headerShown: false }}
          />
          <Stack.Screen
            name="subscription-details/[id]"
            options={{ animation: 'slide_from_right', headerShown: false }}
          />
          <Stack.Screen
            name="add-budget"
            options={{ presentation: 'modal', headerShown: false }}
          />
          <Stack.Screen
            name="budget-details/[id]"
            options={{ animation: 'slide_from_right', headerShown: false }}
          />
          <Stack.Screen
            name="money-insights"
            options={{ animation: 'slide_from_right', headerShown: false }}
          />
          <Stack.Screen
            name="money-health"
            options={{ animation: 'slide_from_right', headerShown: false }}
          />
          <Stack.Screen
            name="goals"
            options={{ animation: 'slide_from_right', headerShown: false }}
          />
          <Stack.Screen
            name="create-goal"
            options={{ animation: 'slide_from_right', headerShown: false }}
          />
          <Stack.Screen
            name="custom-goal-formula"
            options={{ animation: 'slide_from_right', headerShown: false }}
          />
          <Stack.Screen
            name="manage-categories"
            options={{ animation: 'slide_from_right', headerShown: false }}
          />
          <Stack.Screen
            name="ai-chat"
            options={{ animation: 'slide_from_right', headerShown: false }}
          />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
