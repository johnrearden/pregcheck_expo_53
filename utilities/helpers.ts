import { RecordType } from "@/contexts/RecordContext";
import { WeightRecordType } from "@/contexts/WeightRecordContext";
import { HeatRecordType } from "@/contexts/HeatRecordContext";

export function parseDBRecord(obj: any): RecordType {
    return {
        server_pk: obj.server_id,
        device_pk: obj.id,
        device_session_pk: obj.device_session_id,
        owner: obj.owner,
        animal: obj.animal,
        gestation_days: obj.gestation_days,
        tag: obj.tag,
        due_date: obj.due_date,
        days_pregnant: obj.days_pregnant,
        time_unit: obj.time_unit,
        calf_count: obj.calf_count,
        pregnancy_status: obj.pregnancy_status,
        note: obj.note,
        date: obj.date,
        created_at: obj.date,
    };
}

export function parseDBWeightRecord(obj: any): WeightRecordType {
    return {
        id: obj.id,
        owner: obj.owner,
        tag: obj.tag,
        weight: obj.weight,
        sex: obj.sex,
        age_in_days: obj.age_in_days,
        animal: obj.animal,
        weight_unit: obj.weight_unit,
        time_unit: obj.time_unit,
        note: obj.note,
        server_pk: obj.server_id,
        device_session_pk: obj.device_session_id,
        device_pk: obj.id,
        date: obj.date,
    };
}

export function parseDBHeatRecord(obj: any): HeatRecordType {
    return {
        id: obj.id,
        owner: obj.owner,
        tag: obj.tag,
        heat_date: obj.heat_date,
        next_heat_date: obj.next_heat_date,
        note: obj.note,
        created_at: obj.created_at,
        server_pk: obj.server_id,
        device_session_pk: obj.device_session_id,
        device_pk: obj.id,
    };
}