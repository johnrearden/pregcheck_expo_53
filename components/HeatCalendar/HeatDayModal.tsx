import Button from "@/components/Button";
import { HeatRecordType } from "@/contexts/HeatRecordContext";
import { useTheme } from "@/hooks/useTheme";
import { Modal, Text, View, StyleSheet, ScrollView } from "react-native";

export interface HeatDayModalProps {
    date: Date;
    records: HeatRecordType[];
    visible: boolean;
    onClose: () => void;
    testID?: string;
}

const HeatDayModal = (props: HeatDayModalProps) => {
    const { colors, baseStyle } = useTheme();
    const { date, records, visible, onClose } = props;

    // Format the date for display
    const formatDateTitle = (d: Date): string => {
        return d.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
        });
    };

    // Format the last heat date
    const formatLastHeat = (heatDate: string): string => {
        if (!heatDate) return "-";
        const d = new Date(heatDate);
        return d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={baseStyle.modal_overlay}>
                <View style={[baseStyle.modal_content, { maxHeight: "80%" }]}>
                    <Text style={baseStyle.heading_3}>{formatDateTitle(date)}</Text>
                    <Text style={[styles.subtitle, { color: colors.fgColor }]}>
                        {records.length} animal{records.length !== 1 ? "s" : ""} in heat
                    </Text>

                    <View style={[styles.divider, { borderColor: colors.thrdColor }]} />

                    <ScrollView style={styles.tableContainer}>
                        {/* Table Header */}
                        <View style={[styles.tableRow, styles.tableHeader]}>
                            <Text style={[styles.headerCell, { color: colors.fgColor }]}>
                                Tag
                            </Text>
                            <Text style={[styles.headerCell, { color: colors.fgColor }]}>
                                Last Heat
                            </Text>
                        </View>

                        {/* Table Rows */}
                        {records.map((record, index) => (
                            <View
                                key={record.device_pk || index}
                                style={[
                                    styles.tableRow,
                                    {
                                        backgroundColor:
                                            index % 2 === 0
                                                ? colors.bgLightColor
                                                : colors.bgColor,
                                    },
                                ]}
                            >
                                <Text style={[styles.tableCell, { color: colors.fgColor }]}>
                                    {record.tag}
                                </Text>
                                <Text style={[styles.tableCell, { color: colors.fgColor }]}>
                                    {formatLastHeat(record.heat_date)}
                                </Text>
                            </View>
                        ))}
                    </ScrollView>

                    <Button
                        onPress={onClose}
                        title="Close"
                        outline
                        style={{ marginTop: 20, width: "100%" }}
                        testID="heat-day-modal-close-button"
                    />
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    subtitle: {
        fontSize: 16,
        fontFamily: "Nunito",
        marginTop: 5,
    },
    divider: {
        borderBottomWidth: 1,
        width: "100%",
        marginVertical: 15,
    },
    tableContainer: {
        width: "100%",
        maxHeight: 300,
    },
    tableRow: {
        flexDirection: "row",
        paddingVertical: 10,
        paddingHorizontal: 10,
    },
    tableHeader: {
        borderBottomWidth: 1,
        borderBottomColor: "#ccc",
    },
    headerCell: {
        flex: 1,
        fontFamily: "Nunito-Bold",
        fontSize: 16,
    },
    tableCell: {
        flex: 1,
        fontFamily: "Nunito",
        fontSize: 14,
    },
});

export default HeatDayModal;
