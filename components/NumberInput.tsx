import {
    TextInput, StyleProp, TextStyle,
} from "react-native";
import React from "react";
import { useTheme } from "@/hooks/useTheme";


export interface NumberInputProps {
    style?: StyleProp<TextStyle>;
    placeholder?: string;
    placeholderTextColor?: string;
    onChange: (value: string) => void;
    value: number;
    hideZero?: boolean;
    disabled?: boolean;
    testID?: string;
}


const NumberInput = (props: NumberInputProps) => {

    const { baseStyle } = useTheme();

    const valuePropMayHide = props.value === 0 || isNaN(props.value);

    return (
        <TextInput
            keyboardType="numeric"
            style={[baseStyle.numberInput, props.style]}
            placeholder={props.placeholder}
            placeholderTextColor={props.placeholderTextColor || "#999"}
            onChangeText={props.onChange}
            value={valuePropMayHide && props.hideZero ? "" : props.value.toString()}
            editable={!props.disabled} // Disables input
            selectTextOnFocus={!props.disabled} // Prevents selecting text when disabled
            testID={props.testID}
        />
    );
}

export default NumberInput;