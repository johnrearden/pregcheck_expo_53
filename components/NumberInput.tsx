import {
    TextInput, StyleProp, TextStyle,
} from "react-native";
import React, { useState, useEffect } from "react";
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
    allowDecimal?: boolean;  // Allow decimal input (default: false)
}


const NumberInput = (props: NumberInputProps) => {

    const { baseStyle } = useTheme();
    const { allowDecimal = false } = props;

    // Local state to preserve raw input when decimals are allowed
    const [displayValue, setDisplayValue] = useState(
        props.value === 0 && props.hideZero ? "" : props.value.toString()
    );

    // Sync display when parent value changes (from external updates)
    useEffect(() => {
        const propStr = props.value === 0 && props.hideZero ? "" : props.value.toString();
        // When decimals allowed, only sync if user isn't typing a decimal
        if (!allowDecimal || !displayValue.endsWith('.')) {
            setDisplayValue(propStr);
        }
    }, [props.value, props.hideZero, allowDecimal]);

    const handleChange = (text: string) => {
        setDisplayValue(text);
        props.onChange(text);
    };

    const valuePropMayHide = props.value === 0 || isNaN(props.value);

    return (
        <TextInput
            keyboardType={allowDecimal ? "decimal-pad" : "numeric"}
            style={[baseStyle.numberInput, props.style]}
            placeholder={props.placeholder}
            placeholderTextColor={props.placeholderTextColor || "#999"}
            onChangeText={allowDecimal ? handleChange : props.onChange}
            value={allowDecimal ? displayValue : (valuePropMayHide && props.hideZero ? "" : props.value.toString())}
            editable={!props.disabled} // Disables input
            selectTextOnFocus={!props.disabled} // Prevents selecting text when disabled
            testID={props.testID}
        />
    );
}

export default NumberInput;