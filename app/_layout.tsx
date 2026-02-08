import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
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

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary
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
        <Stack screenOptions={{ contentStyle: { backgroundColor } }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="add-transaction" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="monthly-analysis" options={{ animation: 'slide_from_right', headerShown: false }} />
          <Stack.Screen name="yearly-analysis" options={{ animation: 'slide_from_right', headerShown: false }} />
          <Stack.Screen name="stock-details/[symbol]" options={{ animation: 'slide_from_right', headerShown: false }} />
          <Stack.Screen name="analytics" options={{ animation: 'slide_from_right', headerShown: false }} />
          <Stack.Screen name="forecast-details" options={{ animation: 'slide_from_right', headerShown: false }} />
          <Stack.Screen name="settings" options={{ animation: 'slide_from_right', headerShown: false }} />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
