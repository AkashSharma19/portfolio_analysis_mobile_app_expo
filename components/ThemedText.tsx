import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { Typography } from '@/constants/Typography';

export type ThemedTextProps = TextProps & {
  type?: 'regular' | 'medium' | 'semiBold' | 'bold';
};

export function ThemedText({ style, type = 'regular', ...rest }: ThemedTextProps) {
  const fontFamily = Typography.fontFamily[type];

  return (
    <RNText
      style={[
        { fontFamily },
        style,
      ]}
      {...rest}
    />
  );
}
