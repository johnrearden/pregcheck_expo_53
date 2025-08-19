import Button from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Modal, Text, View } from "react-native";

export interface ModalConfirmProps {
    title: string;
    message: string;
    buttonText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    modalVisible: boolean;
    testID?: string;
}

const ModalConfirm = (props: ModalConfirmProps) => {
    const { colors, baseStyle } = useTheme();

    const { title, message, buttonText, onConfirm, onCancel, 
        modalVisible } = props;

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={modalVisible}
            onRequestClose={(onCancel)}
        >
            <View style={baseStyle.modal_overlay}>
                <View style={baseStyle.modal_content}>
                    <Text style={baseStyle.heading_3}>{title}</Text>
                    <Text style={{ color: colors.fgColor }}>{message}</Text>
                    <View style={{ flexDirection: "row", marginTop: 20 }}>
                        <Button
                            onPress={onCancel}
                            title="Cancel"
                            outline
                            style={{ marginTop: 20 }}
                            testID="modal-confirm-cancel-button"
                        ></Button>
                        <Button
                            onPress={onConfirm}
                            title={buttonText || "Finish"}
                            style={{ marginTop: 20, marginLeft: 20, width: "50%" }}
                            testID="modal-confirm-confirm-button"
                        ></Button>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

export default ModalConfirm;