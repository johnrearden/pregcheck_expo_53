# HeatRecord Feature Implementation Plan

## Overview

Add HeatRecord functionality to the mobile app for recording livestock heat (estrus) detection events. This follows the existing WeightRecord pattern with a simplified cattle-only workflow.

### Key Decisions
- **Cattle only** - No animal type selection needed
- **Fixed 21-day cycle** - Next heat date calculated automatically
- **Direct entry from home** - No setup screen, like Weight Check
- **No email summary** - Skip email functionality on session finish

---

## Files to Create

### 1. `contexts/HeatRecordContext.tsx`
State management following WeightRecordContext pattern:

```typescript
// Types
export interface HeatRecordType {
    id?: number;
    owner?: number;
    tag: string;
    heat_date: string;
    next_heat_date?: string;
    note?: string;
    server_pk?: number;
    device_session_pk?: number;
    device_pk?: number;
    created_at?: string;
}

export interface HeatStatsType {
    total: number;
}

// Two-context pattern
export const HeatRecordContext = createContext<HeatRecordType>(...);
export const HeatRecordMethodContext = createContext<HeatRecordMethodContextType>(...);

// Hooks
export const useHeatRecord = () => useContext(HeatRecordContext);
export const useHeatRecordMethod = () => useContext(HeatRecordMethodContext);
```

Key methods:
- `commitRecord()` - Save to SQLite with device_pk
- `handleFinished()` - Batch sync to server (no email)
- `createHeatSession()` - Create local session, persist to AsyncStorage
- `checkDuplicateTag()`, `recallRecord()`, `getTagList()`, `resetHeatState()`

### 2. `app/(protected)/create_heat_record.tsx`
Heat record entry screen with:

**UI Elements:**
- Navbar with "Heat Check" title
- "Edit previous" button (top right, like create_cow_record)
- `TagInput` component (reuse existing) with duplicate validation
- Two buttons side-by-side: "Heat Today" | "Enter Date"
- Native DateTimePicker (platform-specific, max date = today)
- Display: "Next heat expected: [date]" (heat_date + 21 days)
- Notes text field (optional, multiline)
- "Next Animal" button
- Fixed bottom stats bar with record count + "End Session" button
- Success animation overlay (same pattern as create_cow_record)
- ModalConfirm for session end confirmation

**Button Logic:**
- "Next Animal" disabled when: tag is duplicate OR tag not supplied
- "End Session" enabled when "Next Animal" is disabled (inverted)

### 3. `app/(protected)/heat_summary.tsx`
Simple summary screen (no pie chart needed):
- Display total record count
- "Home" button to return
- Interstitial ad (same pattern as preg_summary_cow)

### 4. `app/(protected)/heat_tag_list.tsx` (optional)
List of tags for editing previous records, following weight_tag_list pattern.

---

## Files to Modify

### 1. `constants/asyncStorageKeys.ts`
Add:
```typescript
export const HEAT_SESSION_KEY = 'heatRecord';
```

### 2. `utilities/DatabaseUtils.tsx`

**Add to `migrateDBifNeeded()`:**
```sql
CREATE TABLE IF NOT EXISTS heat_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner INTEGER,
    tag TEXT,
    heat_date TEXT,
    next_heat_date TEXT,
    note TEXT,
    created_at TEXT,
    updated_at TEXT,
    server_session_id INTEGER,
    server_id INTEGER,
    device_session_id INTEGER
);

CREATE TABLE IF NOT EXISTS heat_session (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    vet_name TEXT,
    server_session_id INTEGER,
    record_count INTEGER
);
```

**Add CRUD functions:**
- `addLocalHeatRecord(db, record)` - Insert, return device_pk
- `updateLocalHeatRecord(db, record)` - Update existing
- `getRecordsForHeatSession(db, sessionId)` - Load session records
- `getUnpostedHeatRecords(db)` - Get records with server_id = 0
- `bulkUpdateHeatRecords(db, records, serverSessionId)` - Atomic transaction
- `createLocalHeatSession(db)` - Create session, return id
- `updateLocalHeatSession(db, serverSessionId, deviceSessionId, recordCount)`
- `removeEmptyHeatSession(db, sessionId)`

### 3. `utilities/helpers.ts`
Add:
```typescript
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
```

### 4. `services/RecordSyncService.tsx`
Add heat record sync support:
```typescript
export const checkForPendingHeatRecords = async (db) => {
    return await getUnpostedHeatRecords(db);
}
```

Update `trySync()` to handle heat records (group by session, POST to `exam_session/create_heat_session/`).

### 5. `contexts/RecordSyncContext.tsx`
Add:
- `hasUnpostedHeatRecords` state
- Import `useHeatRecordMethod` for `isHeatSessionRunning`
- `checkUnpostedHeatRecords()` function
- Update `syncRecords()` to include heat records
- Expose `hasUnpostedHeatRecords` in context value

### 6. `app/_layout.tsx`
Add HeatRecordProvider to provider hierarchy:
```typescript
<RecordProvider>
    <WeightRecordProvider>
        <HeatRecordProvider>  {/* NEW */}
            <RecordSyncProvider>
                {/* ... */}
            </RecordSyncProvider>
        </HeatRecordProvider>
    </WeightRecordProvider>
</RecordProvider>
```

### 7. `app/(protected)/index.tsx`
Add Heat Check button:
```typescript
const { createHeatSession, resetHeatState, isHeatSessionRunning } = useHeatRecordMethod();

const hasActiveSession = isSessionRunning || isWeightSessionRunning || isHeatSessionRunning;
const sessionType = isSessionRunning ? 'Pregnancy Scan'
    : isWeightSessionRunning ? 'Weight Scan'
    : 'Heat Check';

const handleHeatCheckPressed = () => {
    if (!isHeatSessionRunning) {
        resetHeatState();
        createHeatSession();
    }
    router.push("/create_heat_record");
}

// Add button after Weight Check button
<Button
    onPress={handleHeatCheckPressed}
    title={isHeatSessionRunning ? "Resume Heat Session" : "Heat Check"}
    disabled={isSessionRunning || isWeightSessionRunning}
/>
```

---

## Implementation Sequence

### Phase 1: Database & Types (Foundation)
1. Add `HEAT_SESSION_KEY` to `constants/asyncStorageKeys.ts`
2. Add database tables and CRUD functions to `utilities/DatabaseUtils.tsx`
3. Add `parseDBHeatRecord` to `utilities/helpers.ts`

### Phase 2: State Management
4. Create `contexts/HeatRecordContext.tsx`
5. Update `app/_layout.tsx` with HeatRecordProvider

### Phase 3: Sync Integration
6. Update `services/RecordSyncService.tsx`
7. Update `contexts/RecordSyncContext.tsx`

### Phase 4: UI Implementation
8. Create `app/(protected)/create_heat_record.tsx`
9. Create `app/(protected)/heat_summary.tsx`
10. Update `app/(protected)/index.tsx` with Heat Check button
11. Create `app/(protected)/heat_tag_list.tsx` (optional)

### Phase 5: Testing
12. Test session persistence across app restarts
13. Test offline/online sync behavior
14. Test database migrations on existing installs

---

## Critical Patterns to Follow

### Reference Files
- `contexts/WeightRecordContext.tsx` - Primary pattern for HeatRecordContext
- `app/(protected)/create_cow_record.tsx` - UI pattern (TagInput, animations, bottom bar)
- `utilities/DatabaseUtils.tsx` - Database schema and CRUD patterns
- `services/RecordSyncService.tsx` - Sync pattern

### Key Implementation Notes
1. **Dual-key system**: `device_pk` (local SQLite id) + `server_pk` (from server, 0 = unsynced)
2. **AsyncStorage persistence**: Save session immediately for crash recovery
3. **Atomic transactions**: Use `withExclusiveTransactionAsync` for bulk updates
4. **Database migration**: Use `CREATE TABLE IF NOT EXISTS` (additive only)
5. **Success animation**: Same pattern as create_cow_record (1.5s display)
6. **Button state**: "Next Animal" and "End Session" have inverted disabled states

### API Endpoints (Backend)
- `POST exam_session/create_heat_session/` - Batch sync records
- `POST exam_session/create_heat_record/` - Create standalone (unused in batch flow)
- `PUT exam_session/edit_heat_record/` - Edit existing record

---

## Testing Checklist
- [ ] Heat session creates and persists to AsyncStorage
- [ ] Heat records save to SQLite with device_pk
- [ ] Duplicate tag detection works within session
- [ ] "Heat Today" sets today's date
- [ ] Date picker works on iOS and Android
- [ ] Next heat date = heat_date + 21 days
- [ ] Session resumes after app restart
- [ ] Empty sessions cleaned up properly
- [ ] Batch sync to server works (online)
- [ ] Offline mode saves locally for later sync
- [ ] Background sync detects unposted heat records
- [ ] Summary screen displays correct count
- [ ] Home screen buttons disable correctly during active sessions
