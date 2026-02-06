import { usePortfolioStore } from '@/store/usePortfolioStore';
import { useColorScheme as useDeviceColorScheme } from 'react-native';

export function useColorScheme() {
    const deviceColorScheme = useDeviceColorScheme();
    const themePreference = usePortfolioStore((state) => state.theme);

    if (themePreference === 'system') {
        return deviceColorScheme;
    }
    return themePreference;
}
