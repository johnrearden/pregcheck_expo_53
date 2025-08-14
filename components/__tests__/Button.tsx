import { TouchableOpacity, Text, StyleProp, ViewStyle, View } from "react-native";
import React from "react";
import { useTheme } from "@/hooks/useTheme";
import { LinearGradient } from 'expo-linear-gradient';


interface ButtonProps {
    onPress: () => void;
    title: string;
    style?: StyleProp<ViewStyle>;
    outline?: boolean;
    disabled?: boolean;
    testID?: string;
}


const Button = ({ onPress, title, style, outline, disabled, testID }: ButtonProps) => {
    const { baseStyle, colors } = useTheme();
    return (outline ? (
        <View 
            style={[baseStyle.shadowContainer, style, { opacity: disabled ? 0.5 : 1 }]}
            testID="button-wrapper">
            <TouchableOpacity
                onPress={onPress}
                style={[baseStyle.button_outline]}
                disabled={disabled}
                testID={testID}
            >
                <Text 
                    style={baseStyle.buttonOutlineText}
                >{title}</Text>
            </TouchableOpacity>
        </View>

    ) : (
        <View 
            style={[baseStyle.shadowContainer, style, { opacity: disabled ? 0.5 : 1 }]}
            testID="button-wrapper">
            <LinearGradient
                colors={[colors.brgtColor, colors.buttonColor]}
                style={[{ borderRadius: 10 }]}
            >
                <TouchableOpacity
                    onPress={onPress}
                    style={[baseStyle.button]}
                    disabled={disabled}
                    testID={testID}
                >
                    <Text 
                        style={baseStyle.buttonText}
                    >{title}</Text>
                </TouchableOpacity>
            </LinearGradient>
        </View>
    )
    );
}

export default Button;