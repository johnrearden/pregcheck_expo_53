import { StyleProp, ViewStyle, TextStyle, ImageStyle } from 'react-native';

type RNStyle = StyleProp<ViewStyle | TextStyle | ImageStyle>;

export function flattenStyle(style: RNStyle): Record<string, any> {
    if (Array.isArray(style)) {
        return Object.assign({}, ...style);
    }
    return style || {};
}