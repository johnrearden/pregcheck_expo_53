import Button from "@/components/Button";
import { HeatCalendar } from "@/components/HeatCalendar";
import Navbar from "@/components/Navbar";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/useToast";
import { api } from "@/services/ApiService";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";

const HeatCalendarScreen = () => {
    const router = useRouter();
    const { colors } = useTheme();
    const [sendingReport, setSendingReport] = useState(false);
    const [reportSent, setReportSent] = useState(false);
    const showToast = useToast();

    const handleSendBreedingReport = async () => {
        setSendingReport(true);
        try {
            const response = await api.post('exam_session/send_breeding_report/', {});
            if (response.success) {
                showToast('Breeding report sent to your email.', 'success');
                setReportSent(true);
            } else if (response.offline) {
                showToast('You are offline. Please try again when connected.', 'warning');
            } else {
                showToast('Failed to send breeding report.', 'error');
            }
        } catch (error) {
            showToast('Failed to send breeding report.', 'error');
        } finally {
            setSendingReport(false);
        }
    };

    return (
        <View
            style={{
                flex: 1,
                justifyContent: "flex-start",
                alignItems: "center",
                backgroundColor: colors.bgColor,
            }}
        >
            <Navbar title="Heat Calendar" subTitle="Animals expected to be in heat" />

            <ScrollView
                contentContainerStyle={{
                    flexGrow: 1,
                    justifyContent: "flex-start",
                    alignItems: "center",
                }}
                showsVerticalScrollIndicator={false}
                style={{
                    flex: 1,
                    width: "100%",
                }}
            >
                <HeatCalendar testID="heat-calendar" />

                <Button
                    title={sendingReport ? "Sending..." : "Send Breeding Report"}
                    onPress={handleSendBreedingReport}
                    disabled={sendingReport || reportSent}
                    style={{ marginTop: 20, width: "70%" }}
                    testID="send-breeding-report-button"
                />
                <Button
                    title="Home"
                    onPress={() => router.push("/")}
                    outline={true}
                    style={{ marginVertical: 20, width: "70%" }}
                    testID="heat-calendar-home-button"
                />
            </ScrollView>
        </View>
    );
};

export default HeatCalendarScreen;
