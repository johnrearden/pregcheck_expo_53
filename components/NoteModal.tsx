import { Modal, Text, View, TextInput, TouchableWithoutFeedback, Keyboard } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import Button from "@/components/Button";

export interface NoteModalProps {
    title: string;
    note?: string;
    onConfirm: () => void;
    onCancel: () => void;
    handleNoteChange: (text: string) => void;
    modalVisible: boolean;
}

const NoteModal = (props: NoteModalProps) => {

    const { baseStyle } = useTheme();
    const { title, note, onConfirm, onCancel, handleNoteChange, modalVisible } = props;

    return (

        <Modal
            animationType="fade"
            transparent={true}
            visible={modalVisible}
            onRequestClose={onCancel}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={baseStyle.modal_overlay}>
                    <View style={baseStyle.modal_content}>
                        <Text style={baseStyle.heading_3}>{title}</Text>
                        <TextInput
                            style={{
                                borderWidth: 1,
                                borderColor: "#ccc",
                                borderRadius: 5,
                                padding: 10,
                                marginTop: 20,
                                width: "100%",
                                height: 100,
                            }}
                            multiline
                            numberOfLines={4}
                            placeholder="Enter your note here"
                            value={note}
                            onChangeText={handleNoteChange}
                        />
                        <Text style={{ marginTop: 20 }}>
                            Note: This note will be saved with the record.
                        </Text>
                        <View style={{ flexDirection: "row", marginTop: 20 }}>
                            <Button
                                onPress={onCancel}
                                title="Cancel"
                                outline
                                style={{ marginTop: 20 }}
                            ></Button>
                            <Button
                                onPress={onConfirm}
                                title="Save"
                                style={{ marginTop: 20, marginLeft: 20, width: "50%" }}
                            ></Button>
                        </View>
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </Modal>

    )
}

export default NoteModal;