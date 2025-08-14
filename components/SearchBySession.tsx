import { useTheme } from "@/hooks/useTheme";
import { useEffect, useState } from "react";
import { getAllSessions, getAllWeightSessions } from "@/utilities/DatabaseUtils";
import { useSQLiteContext } from "expo-sqlite";
import { ScrollView, View, Text, TouchableOpacity } from "react-native";
import { Feather } from '@expo/vector-icons';
import { useRouter } from "expo-router";
import { PregScanSession, WeightSession } from "@/constants/Interfaces";


export interface GenericSession {
    id: number;
    server_pk: number;
    date: string;
    type?: string;
    record_count?: number;
}

// SearchBySession Component
// This component allows users to search for sessions by date and type
// It displays a list of sessions with their details and allows navigation to the records for each session
// It also includes a floating home button for easy navigation back to the home screen
const SearchBySession = () => {
    const router = useRouter();
    const db = useSQLiteContext();
    const { baseStyle, colors } = useTheme();


    const [sessions, setSessions] = useState<GenericSession[]>([]);

    useEffect(() => {
        const fetchSessions = async () => {
            const sessions = await getAllSessions(db) as PregScanSession[];
            const weightSessions = await getAllWeightSessions(db) as WeightSession[];
            const allSessions: GenericSession[] = [];

            sessions.forEach((session: PregScanSession) => {
                allSessions.push({
                    id: session.id,
                    server_pk: session.server_session_id,
                    date: session.date,
                    type: "Preg Scan",
                    record_count: session.record_count,
                });
            });

            weightSessions.forEach((session: WeightSession) => {
                allSessions.push({
                    id: session.id,
                    server_pk: session.server_session_id,
                    date: session.date,
                    type: "Weight Scan",
                    record_count: session.record_count,
                });
            });

            // Add key indicating session type and convert to GenericSession
            setSessions(allSessions);
        };

        fetchSessions();
    }, []);

    // Function to format date as DD MMM YY
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);

        // Check if the date is valid
        if (isNaN(date.getTime())) {
            return dateString; // Return original string if date is invalid
        }

        const day = date.getDate().toString().padStart(2, '0');
        const month = date.toLocaleString('default', { month: 'short' });
        const year = date.getFullYear().toString().substr(-2);

        return `${day} ${month} ${year}`;
    };

    const handleSessionChoice = (session: GenericSession) => {
        if (session.type === "Preg Scan") {
            router.push({
                pathname: "/records_for_session",
                params: {
                    sessionId: session.id,
                    serverSessionId: session.server_pk,
                },
            });
        } else {
            router.push({
                pathname: "/records_for_weight_session",
                params: {
                    sessionId: session.id,
                    serverSessionId: session.server_pk,
                },
            });
        }
    };

    

    return (
        <View
            style={{
                flex: 1,
                justifyContent: "flex-start",
                alignItems: "center",
                backgroundColor: colors.bgColor,
                width: "100%",
                position: "relative",  // Add this for positioning the floating button
            }}
        >
            
            <ScrollView
                contentContainerStyle={{
                    flexGrow: 1,
                    justifyContent: "flex-start",
                    alignItems: "center",
                    paddingBottom: 20,
                    width: "100%",
                }}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {sessions.map((session, index) => (
                    <TouchableOpacity
                        key={index}
                        onPress={() => {
                            handleSessionChoice(session);
                        }}>
                        <View
                            style={{
                                width: "80%",
                                flexDirection: "row",
                                alignItems: "center",
                                padding: 10,
                                borderWidth: 1,
                                borderColor: colors.thrdColor,
                                backgroundColor: colors.bgColor,
                                borderRadius: 10,
                                marginVertical: 5,
                                shadowColor: colors.buttonColor,
                                shadowOpacity: 0.15,
                                shadowOffset: { width: 0, height: 2 },
                                shadowRadius: 4,
                                elevation: 2, // for Android
                            }}
                        >
                            <Text style={{
                                color: colors.fgColor,
                                fontWeight: "bold",
                                fontSize: 16,
                                marginRight: 10,
                            }}>
                                {session.type}
                            </Text>
                            <Text style={[baseStyle.text, { color: colors.fgColor }]}>
                                {formatDate(session.date)}
                            </Text>
                            <Text style={{
                                color: colors.fgColor,
                                fontSize: 16,
                                fontWeight: "bold",
                                marginLeft: "auto"
                            }}>
                                {session.record_count} Records
                            </Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>

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
                onPress={() => router.replace("/")}
                activeOpacity={0.8}
            >
                <Feather name="home" size={30} color={colors.bgColor} />
            </TouchableOpacity>
        </View>
    )
}

export default SearchBySession;