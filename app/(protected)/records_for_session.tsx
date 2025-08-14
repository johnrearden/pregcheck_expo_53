import { RecordType } from "@/contexts/RecordContext";
import { getRecordsForSession } from "@/utilities/DatabaseUtils";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useToast } from '../../hooks/useToast';
import { useEffect, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import RecordTable from "@/components/RecordTable";
import Navbar from "@/components/Navbar";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import Button from "@/components/Button";
import { api } from "@/services/ApiService";


// This component displays records for a specific session.
// It uses the SQLite context to fetch records from the database and displays them in a table format.
// It also includes a floating back button and a home button for easy navigation.
const RecordsForSession = () => {
    const params = useLocalSearchParams();
    const sessionId = params.sessionId as string;
    const serverSessionId = params.serverSessionId as string;

    const db = useSQLiteContext();
    const showToast = useToast();
    const router = useRouter();
    const { colors } = useTheme();

    const [records, setRecords] = useState<RecordType[]>([]);

    // Fetch records for the given session ID when the component mounts or when sessionId changes
    useEffect(() => {
        const fetchRecords = async () => {
            if (sessionId) {
                try {
                    const sessionIdNumber = parseInt(sessionId, 10);
                    const fetchedRecords = await getRecordsForSession(db, sessionIdNumber) as RecordType[];
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
    // This function sends a request to the server to resend the email summary for the session
    const handleResendEmail = async () => {
        console.log("Resend email summary");
        // Request an email summary of the session
        const summaryResponse = await api.post(
            'exam_session/send_pdf_summary/',
            { session_id: serverSessionId }
        );

        if (!summaryResponse.success) {
            if (summaryResponse.offline) {
                showToast('You are offline. Summary email will be sent when connectivity is restored.', 'warning');
            } else if (summaryResponse.error) {
                console.error("Failed to send PDF summary:", summaryResponse.error);
                showToast('Error sending summary email.', 'error');
            }
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
            <RecordTable
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