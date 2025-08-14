import {
    StyleProp, TextStyle, TouchableOpacity,
    Text, View, ViewStyle
} from "react-native";

export interface SegmentedControlProps {
    options: string[];
    selectedOption: string;
    onSelect: (option: string) => void;
    containerStyle?: StyleProp<ViewStyle>;
    buttonStyleSelected?: StyleProp<TextStyle>;
    buttonStyleUnselected?: StyleProp<TextStyle>;
    fgColor?: string;
    bgColor?: string;
    disabled?: boolean;
    testID?: string;
}

const SegmentedControl = (props: SegmentedControlProps) => {

    const { options, selectedOption, onSelect, fgColor, bgColor, containerStyle,
        buttonStyleSelected, buttonStyleUnselected, disabled } = props;

    const customSelectedStyle = (buttonStyleSelected || {}) as TextStyle;
    const customUnselectedStyle = (buttonStyleUnselected || {}) as TextStyle;

    const selectedStyle = {
        backgroundColor: fgColor || 'blue',
        color: bgColor || 'white',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 8,
        textAlign: "center" as "center",
        ...customSelectedStyle,
    };
    const unselectedStyle = {
        color: fgColor || 'blue',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 8,
        textAlign: "center" as "center",
        ...customUnselectedStyle,
    };

    const buttonContainerStyle: ViewStyle = {
        borderRadius: 8,
        overflow: "hidden", // Add overflow hidden for iOS
    };

    return (
        <View
            style={[
                {
                    flexDirection: "row",
                    borderWidth: 1,
                    borderRadius: 10,
                    borderColor: fgColor || 'blue',
                    backgroundColor: bgColor || 'white',
                    alignItems: "center",
                    opacity: disabled ? 0.2 : 1,
                    overflow: 'hidden', // Add overflow hidden for iOS
                },
                containerStyle
            ]}
            testID="segmented-control-container"
        >
            {options.map((option) => (
                <TouchableOpacity
                    key={option}
                    style={buttonContainerStyle}
                    onPress={() => {
                        if (!disabled) {
                            onSelect(option);
                        }
                    }}
                    disabled={disabled}
                    testID={`segmented-control-option-${option}`}
                >
                    <Text style={[
                        selectedOption === option ? selectedStyle : unselectedStyle,
                    ]}>
                        {option}
                    </Text>

                </TouchableOpacity>
            ))
            }
        </View >
    );
}

export default SegmentedControl;