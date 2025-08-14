import { AnimalType } from "./Types";

/**
 * Interface for Preg Scan session
 * 
 */
export interface PregScanSession {
    id: number;
    date: string;
    vet_name: string;
    server_session_id: number;
    record_count: number;
}

/**
 * Interface for Weight session
 */
export interface WeightSession {
    id: number;
    date: string;
    vet_name: string;
    server_session_id: number;
    record_count: number;
}

export interface AsyncStorageSession {
    device_session_pk: number;
    session_type: 'pregnancy' | 'weight';
    animal: AnimalType | null | undefined;
    gestation_days: number;
}