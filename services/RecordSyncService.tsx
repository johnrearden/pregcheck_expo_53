import { RecordType } from "@/contexts/RecordContext";
import { WeightRecordType } from "@/contexts/WeightRecordContext";
import { bulkUpdateRecords, getUnpostedRecords, 
    getUnpostedWeightRecords, bulkUpdateWeightRecords } from "@/utilities/DatabaseUtils"
import { SQLiteDatabase } from "expo-sqlite";
import { api } from "./ApiService";

const RecordSyncService = {

    async checkForPendingRecords(db: SQLiteDatabase): Promise<any[]> {
        const pendingRecords: RecordType[] = await getUnpostedRecords(db);
        return pendingRecords;
    },

    async checkForPendingWeightRecords(db: SQLiteDatabase): Promise<any[]> {
        const pendingWeightRecords: WeightRecordType[] = await getUnpostedWeightRecords(db);
        return pendingWeightRecords;
    },

    async trySync(
        db: SQLiteDatabase,
        records: RecordType[],
        weightRecords: WeightRecordType[],
        showToast: (message: string, type: 'success' | 'error' | 'warning') => void
    ) {
        // Handle pregnancy scan records
        if (records.length > 0) {

            // Organize the records in an object keyed by their session IDs
            const recordsBySessionId: { [key: string]: RecordType[] } = {};
            records.forEach((record) => {
                if (record.device_session_pk && !recordsBySessionId[record.device_session_pk]) {
                    recordsBySessionId[record.device_session_pk] = [];
                }
                if (record.device_session_pk) {
                    recordsBySessionId[record.device_session_pk].push(record);
                }
            });

            for (const sessionId in recordsBySessionId) {
                const unpostedRecords = recordsBySessionId[sessionId];
                const postData = {
                    unposted_records: unpostedRecords,
                    posted_record_ids: [],
                    device_session_pk: sessionId,
                }

                const response = await api.post(
                    'exam_session/create_session/',
                    postData
                );
                if (response.success && response.data) {
                    type ServerResponse = {
                        session: {
                            id: number;
                        },
                        unposted_record_ids: Record<string, number>,
                        owner: number,
                    }
                    const data = response.data as ServerResponse;
                    const server_session_pk = data.session.id;
                    console.log("Response data: ", data);

                    // Update the records with their server ids
                    unpostedRecords.forEach((record) => {
                        if (record.device_pk && data.unposted_record_ids[record.device_pk]) {
                            record.server_pk = data.unposted_record_ids[record.device_pk];
                            record.owner = data.owner;
                        };
                    });

                    // Update the records in the database
                    await bulkUpdateRecords(
                        db,
                        unpostedRecords,
                        server_session_pk
                    );
                    console.log("Records updated successfully with server session pk.");

                    // Request an email summary of the session
                    const summaryResponse = await api.post(
                        'exam_session/send_pdf_summary/',
                        { session_id: server_session_pk }
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
            }
        }

        // Handle weight records
        if (weightRecords.length > 0) {

            // Organize the weight records in an object keyed by their session IDs
            const weightRecordsBySessionId: { [key: string]: WeightRecordType[] } = {};
            weightRecords.forEach((record) => {
                if (record.device_session_pk && !weightRecordsBySessionId[record.device_session_pk]) {
                    weightRecordsBySessionId[record.device_session_pk] = [];
                }
                if (record.device_session_pk) {
                    weightRecordsBySessionId[record.device_session_pk].push(record);
                }
            });

            for (const sessionId in weightRecordsBySessionId) {
                const unpostedWeightRecords = weightRecordsBySessionId[sessionId];
                const postData = {
                    unposted_records: unpostedWeightRecords,
                    posted_record_ids: [],
                    device_session_pk: sessionId,
                }

                const response = await api.post(
                    'exam_session/create_weight_session/',
                    postData
                );

                if (response.success && response.data) {
                    type ServerResponse = {
                        session: {
                            id: number;
                        },
                        unposted_record_ids: Record<string, number>,
                        owner: number,
                    }
                    const data = response.data as ServerResponse;
                    const server_session_pk = data.session.id;
                    console.log("Response data: ", data);

                    // Update the records with their server ids
                    unpostedWeightRecords.forEach((record) => {
                        if (record.device_pk && data.unposted_record_ids[record.device_pk]) {
                            record.server_pk = data.unposted_record_ids[record.device_pk];
                            record.owner = data.owner;
                        };
                    });

                    // Update the records in the database
                    await bulkUpdateWeightRecords(
                        db,
                        unpostedWeightRecords,
                        server_session_pk
                    );
                    console.log("Weight records updated successfully with server session pk.");

                    // Request an email summary of the session
                    const summaryResponse = await api.post(
                        'exam_session/send_weight_summary_email/',
                        { session_id: server_session_pk }
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
            }
        }

        

    }

};

export const { checkForPendingRecords, checkForPendingWeightRecords, trySync } = RecordSyncService;