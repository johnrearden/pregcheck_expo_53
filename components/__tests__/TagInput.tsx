import { Text, View, TextInput, StyleSheet } from "react-native";
import React, { forwardRef } from "react";
import { useTheme } from "@/hooks/useTheme";

export interface TagInputProps {
    tag: string;
    tagSupplied: boolean;
    tagIsDuplicate: boolean;
    handleTagChange: (value: string) => void;
    testID?: string;
}

const TagInput = forwardRef<TextInput, TagInputProps>((props, ref) => {

    const { tag, tagSupplied, tagIsDuplicate, handleTagChange, testID } = props;
    const { colors } = useTheme();

    return (
        <View style={styles.container}>
            <View style={styles.inputRow}>
                <Text 
                    style={[
                        styles.label, 
                        { 
                            width: "40%", // Increase width to 40%
                            textAlign: "right", 
                            paddingRight: 10,
                            color: colors.fgColor ,
                        }
                    ]}
                >
                    Ear Tag
                </Text>
                <View style={[styles.inputContainer, { width: '55%' }]}>
                    <TextInput
                        ref={ref}
                        style={[
                            styles.input,
                            { 
                                borderColor: !tag.trim() ? colors.warnColor : tagIsDuplicate ? colors.warnColor : tagSupplied ? colors.success : colors.thrdColor,
                                color: colors.fgColor,
                                backgroundColor: colors.bgLightColor,
                                width: '100%',
                                paddingRight: 80,
                                fontSize: tag ? 20 : 16, // Smaller font size when placeholder is shown
                            }
                        ]}
                        value={tag}
                        onChangeText={handleTagChange}
                        placeholder="Enter tag"
                        placeholderTextColor={!tag.trim() ? colors.warnColor : colors.fgColor + '80'}
                        autoCapitalize="characters"
                        keyboardType="numeric"
                        testID={testID}
                    />
                    {/* Only show validation message when there is text in the field */}
                    {tag.trim() && (
                        <Text
                            style={[
                                styles.validationMessage,
                                {
                                    color: tagIsDuplicate ? colors.warnColor : colors.success,
                                    right: 10, // Position from right edge
                                }
                            ]}
                        >
                            {tagIsDuplicate ? 'Duplicate' : 'Valid'}
                        </Text>
                    )}
                </View>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        width: '100%', // Full screen width
        marginTop: 20,
        paddingHorizontal: 0,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        justifyContent: 'flex-start', // Changed from space-between to flex-start
    },
    label: {
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'right',
    },
    inputContainer: {
        position: 'relative',
    },
    input: {
        height: 50,
        borderWidth: 1,
        borderRadius: 10,
        padding: 10,
        fontSize: 20,
        fontWeight: 'bold',
    },
    validationMessage: {
        position: 'absolute',
        fontSize: 14,
        fontWeight: 'bold',
        top: '50%',
        transform: [{ translateY: -7 }], // Center the validation message vertically
    },
});

export default TagInput;