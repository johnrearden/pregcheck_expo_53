import { RecordType } from '@/contexts/RecordContext';
import { WeightRecordType } from '@/contexts/WeightRecordContext';
import * as SQLite from 'expo-sqlite';
import { parseDBRecord, parseDBWeightRecord } from './helpers';

// DROP TABLE IF EXISTS records;
// DROP TABLE IF EXISTS sessions;
// DROP TABLE IF EXISTS weight_records;
// DROP TABLE IF EXISTS weight_session;

export const migrateDBifNeeded = async (db: SQLite.SQLiteDatabase) => {

    await db.execAsync(`
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner INTEGER,
    date TEXT,
    animal TEXT,
    gestation_days INTEGER,
    tag TEXT,
    due_date TEXT,
    days_pregnant INTEGER,
    time_unit TEXT,
    calf_count INTEGER,
    pregnancy_status BOOLEAN,
    note TEXT,
    updated_at TEXT,
    server_session_id INTEGER,
    server_id INTEGER,
    device_session_id INTEGER
    );`
    );

    await db.execAsync(`
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    vet_name TEXT,
    server_session_id INTEGER,
    record_count INTEGER
    );`
    );

    await db.execAsync(`
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS weight_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner INTEGER,
    tag TEXT,
    date TEXT,
    weight REAL,
    sex TEXT,
    weight_unit TEXT,
    age_in_days INTEGER,
    animal TEXT,
    time_unit TEXT,
    note TEXT,
    updated_at TEXT,
    server_session_id INTEGER,
    server_id INTEGER,
    device_session_id INTEGER
    );`
    );

    await db.execAsync(`
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS weight_session (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    vet_name TEXT,
    server_session_id INTEGER,
    record_count INTEGER
    );`
    );

    // Check if the due_date column exists in the records table
    const columnInfo = await db.getAllAsync(`
        PRAGMA table_info(records);
    `);
    const columnExists = columnInfo.some((column: any) => column.name === 'due_date');
    if (!columnExists) {
        addDueDateColumn(db);
    }

    // Debug task: Describe existing tables and their structure
    // console.log('--------- DATABASE DEBUG INFORMATION ---------');
    
    // try {
    //     // Get list of all tables
    //     const tables = await db.getAllAsync(`
    //         SELECT name FROM sqlite_master 
    //         WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'android_%'
    //     `);
        
    //     console.log(`Found ${tables.length} tables in the database:`);
        
    //     // For each table, get its structure and some stats
    //     for (const tableObj of tables) {
    //         const tableName = (tableObj as { name: string }).name;
    //         console.log(`\n📋 Table: ${tableName}`);
            
    //         // Get table schema
    //         const tableInfo = await db.getAllAsync(`PRAGMA table_info(${tableName})`);
    //         console.log('  Columns:');
    //         tableInfo.forEach((column) => {
    //             const col = column as { name: string; type: string; pk: number; notnull: number };
    //             console.log(`    - ${col.name} (${col.type})${col.pk ? ' PRIMARY KEY' : ''}${col.notnull ? ' NOT NULL' : ''}`);
    //         });
            
    //         // Get row count
    //         const countResult = await db.getFirstAsync(`SELECT COUNT(*) as count FROM ${tableName}`);
    //         console.log(`  Row count: ${(countResult as { count: number }).count}`);
            
    //         // If table has records, show sample
    //         if ((countResult as { count: number }).count > 0) {
    //             const sample = await db.getFirstAsync(`SELECT * FROM ${tableName} LIMIT 1`);
    //             console.log('  Sample record:');
    //             console.log('  ', JSON.stringify(sample, null, 2).replace(/\n/g, '\n  '));
    //         }
            
    //         // For tables with specific relationships, show more info
    //         if (tableName === 'records' || tableName === 'weight_records') {
    //             // Count records with server_id (synced)
    //             const syncedCount = await db.getFirstAsync(
    //                 `SELECT COUNT(*) as count FROM ${tableName} WHERE server_id IS NOT NULL AND server_id > 0`
    //             );
    //             console.log(`  Synced records: ${(syncedCount as { count: number }).count}`);
                
    //             // Count records without server_id (unsynced)
    //             const unsyncedCount = await db.getFirstAsync(
    //                 `SELECT COUNT(*) as count FROM ${tableName} WHERE server_id IS NULL OR server_id = 0`
    //             );
    //             console.log(`  Unsynced records: ${(unsyncedCount as { count: number }).count}`);
                
    //             // Count unique sessions
    //             const sessionCount = await db.getFirstAsync(
    //                 `SELECT COUNT(DISTINCT device_session_id) as count FROM ${tableName}`
    //             );
    //             console.log(`  Unique sessions: ${(sessionCount as { count: number }).count}`);
    //         }
    //     }
        
    //     console.log('\n--------- END DATABASE DEBUG INFORMATION ---------');
    // } catch (error) {
    //     console.error('Error while generating database debug information:', error);
    // }
}

// Add a due_date column to the records table if it doesn't exist
export const addDueDateColumn = async (db: SQLite.SQLiteDatabase) => {
    try {
        await db.execAsync(`
            PRAGMA journal_mode = WAL;
            ALTER TABLE records ADD COLUMN due_date TEXT;
        `);
        console.log('Due date column added to records table');
    } catch (error) {
        console.error('Error adding due date column:', error);
    }
}


export const addLocalRecord = async (db: SQLite.SQLiteDatabase, record: RecordType) => {

    try {
        const result = await db.runAsync(
            `INSERT INTO records (
                owner,
                date,
                animal,
                gestation_days,
                tag,
                due_date,
                days_pregnant,
                time_unit,
                calf_count,
                pregnancy_status,
                note,
                updated_at,
                server_session_id,
                server_id,
                device_session_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
                record.owner ?? 0,
                new Date().toISOString(),
                record.animal ?? '',
                record.gestation_days ?? 0,
                record.tag ?? '',
                record.due_date ?? '',
                record.days_pregnant ?? 0,
                record.time_unit ?? '',
                record.calf_count ?? 0,
                record.pregnancy_status ?? false,
                record.note ?? '',
                new Date().toISOString(),
                0,
                0,
                record.device_session_pk ?? null,
            ],
        );
        return result.lastInsertRowId;
    } catch (error) {
        console.error('Error adding local record:', error);
    }
}

export const updateLocalRecord = async (db: SQLite.SQLiteDatabase, record: RecordType) => {
    try {
        const result = await db.runAsync(
            `UPDATE records SET
                owner = ?,
                date = ?,
                animal = ?,
                gestation_days = ?,
                tag = ?,
                due_date = ?,
                days_pregnant = ?,
                time_unit = ?,
                calf_count = ?,
                pregnancy_status = ?,
                note = ?,
                updated_at = ?,
                server_session_id = ?,
                server_id = ?,
                device_session_id = ?
            WHERE id = ?`,
            [
                record.owner ?? 0,
                new Date().toISOString(),
                record.animal ?? '',
                record.gestation_days ?? 0,
                record.tag ?? '',
                record.due_date ?? '',
                record.days_pregnant ?? 0,
                record.time_unit ?? '',
                record.calf_count ?? 0,
                record.pregnancy_status ?? false,
                record.note ?? '',
                new Date().toISOString(),
                null,
                record.server_pk ?? 0,
                record.device_session_pk ?? 0,
                record.device_pk ?? 0,
            ],
        );
        return result.changes;
    } catch (error) {
        console.error('Error updating local record:', error);
    }
}

export const createLocalSession = async (db: SQLite.SQLiteDatabase) => {
    try {
        const result = await db.runAsync(
            `INSERT INTO sessions (
                date,
                vet_name,
                server_session_id) VALUES (?,?,?)`,
            [
                new Date().toISOString(),
                '',
                null,
            ],
        );
        return result.lastInsertRowId;
    } catch (error) {
        console.error('Error adding local session:', error);
    }
}

export const updateLocalSession = async (
    db: SQLite.SQLiteDatabase,
    serverSessionId: number,
    deviceSessionId: number,
    recordCount: number
) => {
    try {
        const result = await db.runAsync(
            `UPDATE sessions SET
                date = ?,
                vet_name = ?,
                server_session_id = ?,
                record_count = ?
            WHERE id = ?`,
            [
                new Date().toISOString(),
                '',
                serverSessionId,
                recordCount,
                deviceSessionId,
            ],
        );
        return result.changes;
    } catch (error) {
        console.error('Error updating local session:', error);
    }
}
    

export const addLocalWeightRecord = async (
    db: SQLite.SQLiteDatabase,
    record: WeightRecordType
) => {
    try {
        const result = await db.runAsync(
            `INSERT INTO weight_records (
          owner,
          tag,
          date,
          weight,
          sex,
          weight_unit,
          age_in_days,
          animal,
          time_unit,
          note,
          updated_at,
          server_session_id,
          server_id,
          device_session_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                record.owner ?? 0,
                record.tag ?? '',
                new Date().toISOString(),
                record.weight ?? 0,
                record.sex ?? '',
                record.weight_unit ?? '',
                record.age_in_days ?? 0,
                record.animal ?? '',
                record.time_unit ?? '',
                record.note ?? '',
                new Date().toISOString(),
                0,
                0,
                record.device_session_pk ?? 0,
            ]
        );
        return result.lastInsertRowId;
    } catch (error) {
        console.error('Error adding local weight record:', error);
    }
};


export const updateLocalWeightRecord = async (db: SQLite.SQLiteDatabase, record: WeightRecordType) => {
    try {
        const result = await db.runAsync(
            `UPDATE weight_records SET
                owner = ?,
                tag = ?,
                date = ?,
                weight = ?,
                sex = ?,
                weight_unit = ?,
                age_in_days = ?,
                animal = ?,
                time_unit = ?,
                note = ?,
                updated_at = ?,
                server_session_id = ?,
                server_id = ?,
                device_session_id = ?
            WHERE id = ?`,
            [
                record.owner ?? 0,
                record.tag ?? '',
                new Date().toISOString(),
                record.weight ?? 0,
                record.sex ?? '',
                record.weight_unit ?? '',
                record.age_in_days ?? 0,
                record.animal ?? '',
                record.time_unit ?? '',
                record.note ?? '',
                new Date().toISOString(),
                null,
                record.server_pk ?? 0,
                record.device_session_pk ?? 0,
                record.device_pk ?? 0,
            ],
        );
        return result.changes;
    } catch (error) {
        console.error('Error updating local weight record:', error);
    }
}

export const createLocalWeightSession = async (db: SQLite.SQLiteDatabase) => {
    try {
        const result = await db.runAsync(
            `INSERT INTO weight_session (
                date,
                vet_name,
                server_session_id) VALUES (?,?,?)`,
            [
                new Date().toISOString(),
                '',
                null,
            ],
        );
        return result.lastInsertRowId;
    } catch (error) {
        console.error('Error adding local weight session:', error);
    }
}

export const updateLocalWeightSession = async (
    db: SQLite.SQLiteDatabase, 
    serverSessionId: number,
    deviceSessionId: number,
    recordCount: number) => {
    try {
        const result = await db.runAsync(
            `UPDATE weight_session SET
                date = ?,
                vet_name = ?,
                server_session_id = ?,
                record_count = ?
            WHERE id = ?`,
            [
                new Date().toISOString(),
                '',
                serverSessionId,
                recordCount,
                deviceSessionId,
            ],
        );
        return result.changes;
    } catch (error) {
        console.error('Error updating local weight session:', error);
    }
}

export const bulkUpdateRecords = async (
    db: SQLite.SQLiteDatabase,
    records: RecordType[],
    serverSessionId: number,
) => {
    // Create a transaction
    await db.execAsync('BEGIN TRANSACTION');
    try {
        // Loop through each record and update it
        for (const record of records) {
            await db.runAsync(
                `UPDATE records SET
                    server_session_id = ?,
                    server_id = ?,
                    owner = ?
                WHERE id = ?`,
                [
                    serverSessionId,
                    record.server_pk ?? 0,
                    record.owner ?? 0,
                    record.device_pk ?? 0,
                ],
            );
        }
        // Commit the transaction
        await db.execAsync('COMMIT');
    } catch (error) {
        // Rollback the transaction in case of an error
        await db.execAsync('ROLLBACK');
        console.error('Error updating records:', error);
    }
}


export const bulkUpdateWeightRecords = async (
    db: SQLite.SQLiteDatabase,
    records: WeightRecordType[],
    serverSessionId: number,
) => {
    // Create a transaction
    await db.execAsync('BEGIN TRANSACTION');
    try {
        // Loop through each record and update it
        for (const record of records) {
            await db.runAsync(
                `UPDATE weight_records SET
                    server_session_id = ?,
                    server_id = ?,
                    owner = ?
                WHERE id = ?`,
                [
                    serverSessionId,
                    record.server_pk ?? 0,
                    record.owner ?? 0,
                    record.device_pk ?? 0,
                ],
            );
        }
        // Commit the transaction
        await db.execAsync('COMMIT');
    } catch (error) {
        // Rollback the transaction in case of an error
        await db.execAsync('ROLLBACK');
        console.error('Error updating weight records:', error);
    }
}

export const getRecordsForSession = async (
    db: SQLite.SQLiteDatabase,
    sessionId: number
) => {
    try {
        const result = await db.getAllAsync(
            `SELECT * FROM records WHERE device_session_id = ?`,
            [sessionId]
        );
        
        // Convert the result to an array of RecordType
        const records: RecordType[] = result.map((record: any) => parseDBRecord(record));
        return records;
    } catch (error) {
        console.error('Error fetching records for session:', error);
        return []; // Return empty array on error
    }
}

export const getRecordsForWeightSession = async (
    db: SQLite.SQLiteDatabase,
    sessionId: number
) => {
    try {
        const result = await db.getAllAsync(
            `SELECT * FROM weight_records WHERE device_session_id = ?`,
            [sessionId]
        );

        // Convert the result to an array of WeightRecordType
        const records: WeightRecordType[] = result.map((record: any) => parseDBWeightRecord(record));
        return records;
    } catch (error) {
        console.error('Error fetching weight records for session:', error);
        return []; // Return empty array on error
    }
}

export const getRecordsByTag = async (
    db: SQLite.SQLiteDatabase,
    tag: string
) => {
    try {
        const result = await db.getAllAsync(
            `SELECT * FROM records WHERE tag = ?`,
            [tag]
        );
        
        // Return the array of records directly
        return result;
    } catch (error) {
        console.error('Error fetching records by tag:', error);
        return []; // Return empty array on error
    }
}

export const getWeightRecordsByTag = async (
    db: SQLite.SQLiteDatabase,
    tag: string
) => {
    try {
        const result = await db.getAllAsync(
            `SELECT * FROM weight_records WHERE tag = ?`,
            [tag]
        );
        
        // Return the array of records directly
        return result;
    } catch (error) {
        console.error('Error fetching weight records by tag:', error);
        return []; // Return empty array on error
    }
}

export const getAllSessions = async (
    db: SQLite.SQLiteDatabase
) => {
    try {
        const result = await db.getAllAsync(
            `SELECT * FROM sessions`
        );
        
        // Return the array of records directly
        return result;
    } catch (error) {
        console.error('Error fetching all sessions:', error);
        return []; // Return empty array on error
    }
}

export const getAllWeightSessions = async (
    db: SQLite.SQLiteDatabase
) => {
    try {
        const result = await db.getAllAsync(
            `SELECT * FROM weight_session`
        );
        
        // Return the array of records directly
        return result;
    } catch (error) {
        console.error('Error fetching all weight sessions:', error);
        return []; // Return empty array on error
    }
}

export const truncateAllTables = async (db: SQLite.SQLiteDatabase) => {
    try {
        await db.execAsync('DELETE FROM records');
        await db.execAsync('DELETE FROM sessions');
        await db.execAsync('DELETE FROM weight_records');
        await db.execAsync('DELETE FROM weight_session');
        console.log('All tables truncated');
    } catch (error) {
        console.error('Error truncating tables:', error);
    }
}

export const getUnpostedRecords = async (db: SQLite.SQLiteDatabase) => {
    try {
        // const result = await db.getAllAsync(
        //     `SELECT * FROM records WHERE server_id IS NULL OR server_id = 0`
        // );

        const result = await db.getAllAsync(
            `SELECT * FROM records WHERE server_id = 0`
        );
        
        // Convert the result to an array of RecordType
        const records: RecordType[] = result.map((record: any) => parseDBRecord(record));
        return records;
    } catch (error) {
        console.error('Error fetching unposted records:', error);
        return []; // Return empty array on error
    }
}

export const getUnpostedWeightRecords = async (db: SQLite.SQLiteDatabase) => {
    try {
        // const result = await db.getAllAsync(
        //     `SELECT * FROM weight_records WHERE server_id IS NULL OR server_id = 0`
        // );

        const result = await db.getAllAsync(
            `SELECT * FROM weight_records WHERE server_id = 0`
        );
        
        // Convert the result to an array of WeightRecordType
        const records: WeightRecordType[] = result.map((record: any) => parseDBWeightRecord(record));
        return records;
    } catch (error) {
        console.error('Error fetching unposted weight records:', error);
        return []; // Return empty array on error
    }
}

export const getAllRecords = async (db: SQLite.SQLiteDatabase) => {
    try {
        const result = await db.getAllAsync(
            `SELECT * FROM records`
        );
        
        // Convert the result to an array of RecordType
        const records: RecordType[] = result.map((record: any) => parseDBRecord(record));
        return records;
    } catch (error) {
        console.error('Error fetching all records:', error);
        return []; // Return empty array on error
    }
}

export const getAllFutureDueRecords = async (db: SQLite.SQLiteDatabase) => {
    try {
        const result = await db.getAllAsync(
            `SELECT * FROM records WHERE date(due_date) >= date('now');`
        );
        
        // Convert the result to an array of RecordType
        const records: RecordType[] = result.map((record: any) => parseDBRecord(record));
        return records;
    } catch (error) {
        console.error('Error fetching all records:', error);
        return []; // Return empty array on error
    }
}

export const removeEmptySession = async (db: SQLite.SQLiteDatabase, sessionID: number) => {
    try {
        const result = await db.runAsync(
            `DELETE FROM sessions WHERE id = ?`,
            [sessionID]
        );
        return result.changes;
    } catch (error) {
        console.error('Error fetching unposted records:', error);
        return []; // Return empty array on error
    }
}

export const removeEmptyWeightSession = async (db: SQLite.SQLiteDatabase, sessionID: number) => {
    try {
        const result = await db.runAsync(
            `DELETE FROM weight_session WHERE id = ?`,
            [sessionID]
        );
        return result.changes;
    } catch (error) {
        console.error('Error fetching unposted records:', error);
        return []; // Return empty array on error
    }
}