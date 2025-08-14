import { getRecordsForWeightSession } from "@/utilities/DatabaseUtils";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useToast } from '../../hooks/useToast';
import { useEffect, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import Navbar from "@/components/Navbar";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { WeightRecordType } from "@/contexts/WeightRecordContext";
import WeightRecordTable from "@/components/WeightRecordTable";
import { api } from "@/services/ApiService";
import Button from "@/components/Button";


// This component displays records for a specific weight session.
const RecordsForSession = () => {
    const params = useLocalSearchParams();
    const sessionId = params.sessionId as string;
    const serverSessionId = params.serverSessionId as string;
    console.log('serverSessionId', serverSessionId);

    const db = useSQLiteContext();
    const router = useRouter();
    const showToast = useToast();
    const { colors } = useTheme();

    const [records, setRecords] = useState<WeightRecordType[]>([]);

    // Fetch records for the given session ID when the component mounts or when sessionId changes
    // This function retrieves weight records from the database for the specified session ID.
    useEffect(() => {
        const fetchRecords = async () => {
            if (sessionId) {
                try {
                    const sessionIdNumber = parseInt(sessionId, 10);
                    const fetchedRecords = await getRecordsForWeightSession(db, sessionIdNumber) as WeightRecordType[];
                    setRecords(fetchedRecords || []);
                } catch (error) {
                    console.error("Error fetching records:", error);
                    setRecords([]);
                }
            } else {
                console.warn("No session ID provided");
                setRecords([]);
            }
        };

        fetchRecords();
    }, [sessionId, db]);

    // Function to handle the resend email button click
    // This function sends a request to the server to resend the email summary for the session.
    const handleResendEmail = async () => {
        console.log("Resend email summary");
        // Request an email summary of the session
        const emailResponse = await api.post(
            'exam_session/send_weight_summary_email/',
            { session_id: serverSessionId }
        );
        if (emailResponse.success) {
            showToast('Email summary sent successfully.', 'success');
        }
        else if (emailResponse.error) {
            console.error("Failed to send email summary:", emailResponse.error);
            showToast('Error sending email summary.', 'error');
        }
    }

    return (
        <View
            style={{
                flex: 1,
                justifyContent: "flex-start",
                alignItems: "center",
                backgroundColor: colors.bgColor,
                width: "100%",
            }}
        >
            <Navbar
                title="Preg Check"
                subTitle="Search By Session"
            />

            <View
                style={{
                    width: "90%",
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                    marginTop: 20,
                    marginBottom: 10,
                }}
            >
                <Button
                    onPress={handleResendEmail}
                    title="Resend Email Summary"
                    style={{ marginVertical: 10 }}
                ></Button>
            </View>

            <WeightRecordTable
                records={records}
            />

            {/* Back Button */}
            <TouchableOpacity
                style={{
                    position: 'absolute',
                    bottom: 90, // Position above the home button
                    right: 20,
                    backgroundColor: colors.buttonColor,
                    borderRadius: 30,
                    width: 60,
                    height: 60,
                    justifyContent: 'center',
                    alignItems: 'center',
                    elevation: 5,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 3.84,
                }}
                onPress={() => router.back()}
                activeOpacity={0.8}
            >
                <Feather name="arrow-left" size={30} color={colors.bgColor} />
            </TouchableOpacity>

            {/* Floating Home Button */}
            <TouchableOpacity
                style={{
                    position: 'absolute',
                    bottom: 20,
                    right: 20,
                    backgroundColor: colors.buttonColor,
                    borderRadius: 30,
                    width: 60,
                    height: 60,
                    justifyContent: 'center',
                    alignItems: 'center',
                    elevation: 5,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 3.84,
                }}
                onPress={() => router.push("/")}
                activeOpacity={0.8}
            >
                <Feather name="home" size={30} color={colors.bgColor} />
            </TouchableOpacity>
        </View>
    )

}

export default RecordsForSession;