# Heat Notification Feature Implementation Plan

## Overview

Add daily local notifications to alert users when animals are coming into heat. Notifications display specific ear tag numbers and fire at a user-configurable time.

### Key Requirements
- **Specific tag numbers always** - Notification must list actual ear tags, even when app is killed
- **Configurable time** - User sets preferred notification time (default 7:00 AM)
- **Local notifications only** - Sent from app, not backend
- **Disabled by default** - User must opt-in via settings
- **No notification if empty** - Only notify when animals are actually in heat

---

## Approach: Pre-Scheduled Notifications

Since we need specific tag numbers even when the app is killed, we use **pre-scheduled notifications per date** with content baked in at scheduling time.

### How It Works
1. Query all heat records with `next_heat_date` in the next 30 days
2. Group records by date
3. For each date with animals, schedule ONE notification with content: "Animals in heat: TAG1, TAG2, TAG3"
4. Reschedule all notifications whenever:
   - A heat record is added/updated/deleted
   - The notification time setting changes
   - Notifications are enabled/disabled

### Why This Works
- iOS allows ~64 scheduled notifications (we use max 30 for 30 days)
- Content is static but we reschedule on every record change
- Notifications fire reliably even when app is killed
- No backend dependency

---

## Files to Create

### 1. `services/HeatNotificationService.ts`
Notification scheduling utilities:

```typescript
import * as Notifications from 'expo-notifications';
import { SQLiteDatabase } from 'expo-sqlite';

const HEAT_NOTIFICATION_PREFIX = 'heat-reminder-';

// Schedule notifications for all upcoming heat dates
export async function scheduleAllHeatNotifications(
  db: SQLiteDatabase,
  hour: number,
  minute: number
): Promise<void>;

// Cancel all heat notifications
export async function cancelAllHeatNotifications(): Promise<void>;

// Query records with next_heat_date in next 30 days, grouped by date
export async function getUpcomingHeatRecordsByDate(
  db: SQLiteDatabase
): Promise<Map<string, string[]>>; // date -> tag[]

// Request notification permissions
export async function requestNotificationPermissions(): Promise<boolean>;
```

### 2. `contexts/NotificationSettingsContext.tsx`
Settings storage following ThemeContext pattern:

```typescript
interface NotificationSettings {
  heatNotificationsEnabled: boolean;
  notificationTime: { hour: number; minute: number };
}

// Default: disabled, 7:00 AM
// Stored in SecureStore
// Provides: settings, setHeatNotificationsEnabled, setNotificationTime
```

### 3. `contexts/NotificationContext.tsx`
Notification lifecycle management:

```typescript
// Responsibilities:
// - Request permissions on mount
// - Reschedule notifications when settings change
// - Configure notification handler
```

---

## Files to Modify

### 1. `utilities/DatabaseUtils.tsx`
Add query function:

```typescript
export const getHeatRecordsForDateRange = async (
  db: SQLiteDatabase,
  startDate: string,  // 'YYYY-MM-DD'
  endDate: string
): Promise<HeatRecordType[]> => {
  const result = await db.getAllAsync(
    `SELECT * FROM heat_records
     WHERE date(next_heat_date) >= date(?)
     AND date(next_heat_date) <= date(?)`,
    [startDate, endDate]
  );
  return result.map((r: any) => parseDBHeatRecord(r));
};
```

### 2. `contexts/HeatRecordContext.tsx`
Trigger reschedule after record changes:

```typescript
// In commitRecord() - after saving to DB:
await rescheduleHeatNotifications();

// In handleFinished() - after session ends:
await rescheduleHeatNotifications();
```

### 3. `app/_layout.tsx`
Add notification providers:

```typescript
<NotificationSettingsProvider>
  <NotificationProvider>
    <SQLiteProvider ...>
      {/* existing providers */}
    </SQLiteProvider>
  </NotificationProvider>
</NotificationSettingsProvider>
```

### 4. `app/(protected)/settings.tsx`
Add notification settings UI:

- Toggle switch: "Heat Notifications"
- Time picker: "Notification Time" (shown when enabled)
- Permission status indicator

### 5. `app.json`
Add expo-notifications plugin:

```json
{
  "plugins": [
    ["expo-notifications", {
      "icon": "./assets/images/notification-icon.png",
      "color": "#ffffff"
    }]
  ],
  "android": {
    "permissions": ["android.permission.SCHEDULE_EXACT_ALARM"]
  }
}
```

### 6. `constants/asyncStorageKeys.ts`
Add:
```typescript
export const NOTIFICATION_SETTINGS_KEY = 'notification_settings';
```

---

## Implementation Sequence

### Phase 1: Foundation
1. Add `expo-notifications` plugin to `app.json`
2. Add `NOTIFICATION_SETTINGS_KEY` to constants
3. Create `services/HeatNotificationService.ts`
4. Add `getHeatRecordsForDateRange()` to DatabaseUtils

### Phase 2: Settings
5. Create `contexts/NotificationSettingsContext.tsx`
6. Create `contexts/NotificationContext.tsx`
7. Add providers to `app/_layout.tsx`

### Phase 3: Integration
8. Update `HeatRecordContext.tsx` to trigger reschedule on record changes
9. Add notification settings UI to `settings.tsx`

### Phase 4: Testing
10. Test notification scheduling/cancellation
11. Test reschedule on record changes
12. Test time picker and settings persistence
13. Test on both iOS and Android

---

## Critical Implementation Details

### Notification Scheduling Logic

```typescript
async function scheduleAllHeatNotifications(db, hour, minute) {
  // 1. Cancel all existing heat notifications
  await cancelAllHeatNotifications();

  // 2. Get records for next 30 days grouped by date
  const today = new Date();
  const endDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const records = await getHeatRecordsForDateRange(db, formatDate(today), formatDate(endDate));

  // 3. Group by next_heat_date
  const byDate = new Map<string, string[]>();
  for (const record of records) {
    const date = record.next_heat_date;
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date).push(record.tag);
  }

  // 4. Schedule one notification per date
  for (const [date, tags] of byDate) {
    const triggerDate = new Date(date);
    triggerDate.setHours(hour, minute, 0, 0);

    // Skip if date has already passed
    if (triggerDate <= new Date()) continue;

    await Notifications.scheduleNotificationAsync({
      identifier: `${HEAT_NOTIFICATION_PREFIX}${date}`,
      content: {
        title: 'Animals Coming Into Heat Today',
        body: `Tags: ${tags.join(', ')}`,
        data: { type: 'heat_reminder', date },
      },
      trigger: triggerDate,
    });
  }
}
```

### Reschedule Triggers
Call `scheduleAllHeatNotifications()` when:
1. Heat record is committed (add/update)
2. Heat session finishes
3. Notification time setting changes
4. Heat notifications are enabled
5. App launches (if notifications enabled)

### iOS Considerations
- Max ~64 scheduled notifications - we use max 30 (one per day for 30 days)
- Need to request permissions before scheduling
- Use `Notifications.getPermissionsAsync()` to check status

### Android Considerations
- Need `SCHEDULE_EXACT_ALARM` permission for precise timing
- Notifications work reliably when app is killed

---

## Settings UI Design

In `settings.tsx`, add a new section:

```
┌─────────────────────────────────────┐
│ Heat Notifications                  │
├─────────────────────────────────────┤
│ Enable Notifications    [Toggle]    │
│                                     │
│ Notification Time       7:00 AM  >  │
│ (tap to change)                     │
│                                     │
│ Receive daily reminders when        │
│ animals are expected to come        │
│ into heat.                          │
└─────────────────────────────────────┘
```

---

## Testing Checklist
- [ ] Notifications schedule correctly for future dates
- [ ] No notification scheduled for dates with no animals
- [ ] Notifications include correct tag numbers
- [ ] Reschedule works when adding new heat record
- [ ] Reschedule works when changing notification time
- [ ] Toggle enable/disable works correctly
- [ ] Settings persist across app restarts
- [ ] Permissions requested appropriately
- [ ] Works on iOS (dev build)
- [ ] Works on Android (dev build)
- [ ] Notification fires when app is killed
- [ ] Notification fires when app is in foreground

---

## Files Summary

### New Files
- `services/HeatNotificationService.ts`
- `contexts/NotificationSettingsContext.tsx`
- `contexts/NotificationContext.tsx`

### Modified Files
- `app.json` - Add expo-notifications plugin
- `app/_layout.tsx` - Add notification providers
- `app/(protected)/settings.tsx` - Add notification UI
- `contexts/HeatRecordContext.tsx` - Trigger reschedule
- `utilities/DatabaseUtils.tsx` - Add date range query
- `constants/asyncStorageKeys.ts` - Add settings key
