import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

interface BackButtonProps {
  onPress?: () => void;
  color?: string;
  borderColor?: string;
}

export const BackButton = ({
  onPress,
  color,
  borderColor,
}: BackButtonProps) => {
  const router = useRouter();
  const theme = useColorScheme() ?? 'dark';
  const c = Colors[theme];

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onPress) {
      onPress();
    } else {
      router.back();
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[styles.container, { borderColor: borderColor ?? c.border }]}
      activeOpacity={0.7}
    >
      <ArrowLeft size={24} color={color ?? c.text} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
});
