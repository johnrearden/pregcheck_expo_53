import {
    TextInput, StyleProp, TextStyle,
} from "react-native";
import React from "react";
import { useTheme } from "@/hooks/useTheme";


export interface StringInputProps {
    style?: StyleProp<TextStyle>;
    placeholder?: string;
    onChange: (value: string) => void;
    value: string;
    hideZero?: boolean;
    disabled?: boolean;
    numericOnly?: boolean;
    testID?: string;
    inputRef?: React.Ref<TextInput>;
}


const StringInput = (props: StringInputProps) => {

    const { baseStyle } = useTheme();


    return (
        <TextInput
            keyboardType={props.numericOnly ? "numeric" : "default"}
            style={[baseStyle.numberInput, props.style]}
            placeholder={props.placeholder}
            onChangeText={props.onChange}
            value={props.value === '0' && props.hideZero ? "" : props.value.toString()}
            editable={!props.disabled} // Disables input
            selectTextOnFocus={!props.disabled} // Prevents selecting text when disabled
            testID={props.testID}
            ref={props.inputRef}
        />
    );
}

export default StringInput;