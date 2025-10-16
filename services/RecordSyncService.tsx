import { RecordType } from "@/contexts/RecordContext";
import { WeightRecordType } from "@/contexts/WeightRecordContext";
import { bulkUpdateRecords, getUnpostedRecords,
    getUnpostedWeightRecords, bulkUpdateWeightRecords,
    updateLocalSession, updateLocalWeightSession } from "@/utilities/DatabaseUtils"
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
        console.log('[RecordSyncService] trySync started with', records.length, 'preg records and', weightRecords.length, 'weight records');
        let pregSessionsSynced = 0;
        let weightSessionsSynced = 0;

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

                console.log('[RecordSyncService] Syncing pregnancy session', sessionId, 'with', unpostedRecords.length, 'records');

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
                    console.log("[RecordSyncService] Pregnancy session synced successfully, server ID:", server_session_pk);

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
                    console.log("[RecordSyncService] Local database updated for pregnancy session");

                    // Update the local session with server ID and record count
                    await updateLocalSession(db, server_session_pk, parseInt(sessionId), unpostedRecords.length);
                    console.log("[RecordSyncService] Local session updated with server ID and record count");

                    pregSessionsSynced++;

                    // Request an email summary of the session (non-critical)
                    try {
                        const summaryResponse = await api.post(
                            'exam_session/send_pdf_summary/',
                            { session_id: server_session_pk }
                        );

                        if (!summaryResponse.success) {
                            if (summaryResponse.offline) {
                                console.log('[RecordSyncService] Offline for email summary');
                            } else if (summaryResponse.error) {
                                console.error("[RecordSyncService] Failed to send PDF summary:", summaryResponse.error);
                            }
                        }
                    } catch (emailError) {
                        console.error("[RecordSyncService] Non-critical error sending email:", emailError);
                    }
                } else if (response.offline) {
                    console.error('[RecordSyncService] Offline - cannot sync pregnancy session', sessionId);
                    throw new Error('You are offline. Please check your internet connection.');
                } else if (response.error) {
                    console.error('[RecordSyncService] Error syncing pregnancy session', sessionId, ':', response.error);
                    throw new Error(`Failed to sync pregnancy records: ${response.error}`);
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

                console.log('[RecordSyncService] Syncing weight session', sessionId, 'with', unpostedWeightRecords.length, 'records');

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
                    console.log("[RecordSyncService] Weight session synced successfully, server ID:", server_session_pk);

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
                    console.log("[RecordSyncService] Local database updated for weight session");

                    // Update the local weight session with server ID and record count
                    await updateLocalWeightSession(db, server_session_pk, parseInt(sessionId), unpostedWeightRecords.length);
                    console.log("[RecordSyncService] Local weight session updated with server ID and record count");

                    weightSessionsSynced++;

                    // Request an email summary of the session (non-critical)
                    try {
                        const summaryResponse = await api.post(
                            'exam_session/send_weight_summary_email/',
                            { session_id: server_session_pk }
                        );

                        if (!summaryResponse.success) {
                            if (summaryResponse.offline) {
                                console.log('[RecordSyncService] Offline for email summary');
                            } else if (summaryResponse.error) {
                                console.error("[RecordSyncService] Failed to send weight summary email:", summaryResponse.error);
                            }
                        }
                    } catch (emailError) {
                        console.error("[RecordSyncService] Non-critical error sending email:", emailError);
                    }
                } else if (response.offline) {
                    console.error('[RecordSyncService] Offline - cannot sync weight session', sessionId);
                    throw new Error('You are offline. Please check your internet connection.');
                } else if (response.error) {
                    console.error('[RecordSyncService] Error syncing weight session', sessionId, ':', response.error);
                    throw new Error(`Failed to sync weight records: ${response.error}`);
                }
            }
        }

        // Show success message if any sessions were synced
        const totalSynced = pregSessionsSynced + weightSessionsSynced;
        if (totalSynced > 0) {
            console.log('[RecordSyncService] Sync complete:', pregSessionsSynced, 'pregnancy sessions,', weightSessionsSynced, 'weight sessions');
            showToast(`Successfully synced ${totalSynced} session${totalSynced > 1 ? 's' : ''}!`, 'success');
        }
    }

};

export const { checkForPendingRecords, checkForPendingWeightRecords, trySync } = RecordSyncService;