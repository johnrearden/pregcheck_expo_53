import { Modal, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import Button from "@/components/Button";


export interface DeleteUserConfirmModalProps {
    title: string;
    message: string;
    buttonText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    modalVisible: boolean;
}


const DeleteUserConfirmModal = (props: DeleteUserConfirmModalProps) => {
    const { baseStyle, colors } = useTheme();

    const { title, message, onConfirm, onCancel, modalVisible } = props;

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
                    <Text style={{ marginTop: 10 }}>{message}</Text>
                    <View style={{ 
                        flexDirection: "column", 
                        marginTop: 20,
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        }}>
                        <Button
                            onPress={onCancel}
                            title="Cancel"
                            style={{ marginTop: 20, width: '70%' }}
                        ></Button>
                        <TouchableOpacity
                            onPress={() => onConfirm()}
                            style={{
                                marginTop: 30,
                                width: '70%',
                                backgroundColor: colors.error,
                                paddingHorizontal: 10,
                                paddingVertical: 8,
                                borderRadius: 10,
                                alignItems: 'center',
                                justifyContent: 'center',
                                shadowOffset: {
                                    width: 0,
                                    height: 2,
                                },
                                shadowOpacity: 0.25,
                                shadowRadius: 3.84,
                                elevation: 5,
                            }}
                        >
                            <Text
                                style={{
                                    color: colors.bgColor,
                                    fontSize: 24,
                                }}
                            >
                                Delete Account
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

export default DeleteUserConfirmModal;