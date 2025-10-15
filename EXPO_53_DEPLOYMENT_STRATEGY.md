# Expo 53 Deployment Strategy

**Date Created**: 2025-10-15
**Purpose**: Safe deployment of Pregcheck Expo 53 upgrade to production with active users
**Compliance Requirement**: Google Play 16 KB memory page size support (Deadline: Nov 1, 2025)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Risk Assessment](#risk-assessment)
3. [Database Migration Strategy](#database-migration-strategy)
4. [Automated Testing Strategy](#automated-testing-strategy)
5. [Manual Testing Checklist](#manual-testing-checklist)
6. [Staged Deployment Plan](#staged-deployment-plan)
7. [Rollback Procedures](#rollback-procedures)
8. [Monitoring & Validation](#monitoring--validation)

---

## Executive Summary

### Current State
- **Expo Version**: Upgraded from 52 to 53
- **App Version**: 1.1.0 (from app.json)
- **Active Users**: Production app with users on physical devices
- **Manual Testing**: Dev build (`npx expo start --dev-client`) functioning correctly
- **Database**: SQLite with 4 tables, no formal migration library

### Upgrade Reason
Google Play Store warning: Apps must support 16 KB memory page sizes by November 1, 2025.

### Critical Concerns
1. **Database Compatibility**: Existing user data must migrate seamlessly
2. **Offline Sync**: Unposted records must not be lost during update
3. **User Experience**: No data loss, no crashes, seamless transition
4. **Update Path**: Users will update from Expo 52 (v1.0.x) → Expo 53 (v1.1.0)

### Deployment Timeline
- **Phase 1**: Internal Testing (Play Store Internal Testing Track) - 1 week
- **Phase 2**: TestFlight Beta (iOS) + Open Testing (Android) - 1-2 weeks
- **Phase 3**: Phased Production Rollout - 2-4 weeks
- **Total Duration**: 4-7 weeks for full rollout

---

## Risk Assessment

### HIGH RISK Areas

#### 1. Database Schema Migration
**Risk**: Existing SQLite databases on user devices may not be compatible with Expo 53's expo-sqlite v15.2.14

**Current Schema** (from DatabaseUtils.tsx):
- **4 tables**: `records`, `sessions`, `weight_records`, `weight_session`
- **Migration pattern**: `CREATE TABLE IF NOT EXISTS` + conditional `ALTER TABLE` for `due_date` column
- **No version tracking**: Database schema changes detected via `PRAGMA table_info()`

**Mitigation**:
- Test upgrade path with populated database (see Testing Strategy)
- Verify `migrateDBifNeeded()` executes successfully on app launch
- Ensure existing data remains accessible after migration
- No destructive changes to schema

#### 2. Unposted Records During Update
**Risk**: Users with unsynced records (offline data) could lose data if update interrupts sync process

**Current State**:
- `RecordSyncContext` checks for unposted records every 60 seconds
- Records marked with `server_id = 0` are unsynced
- AsyncStorage maintains session state

**Mitigation**:
- Test update with unposted records present
- Verify AsyncStorage persists across update
- Confirm sync process resumes after update
- Monitor for sync failures post-deployment

#### 3. Offline Functionality
**Risk**: Core offline-first architecture could break with Expo 53 changes

**Dependencies**:
- `expo-sqlite` v15.2.14 (upgraded from v14.x)
- `@react-native-async-storage/async-storage` v2.1.2
- `@react-native-community/netinfo` v11.4.1

**Mitigation**:
- Test complete offline workflow (create session → add records → go offline → return online → sync)
- Verify NetInfo detects connectivity changes
- Test AsyncStorage persistence

#### 4. React Native Google Mobile Ads
**Risk**: Known Kotlin compilation issues with v15.4.0 (see README.md)

**Current Version**: 15.4.0 (potentially problematic)

**Mitigation**:
- Monitor build success in EAS
- Prepared to downgrade to 14.7.2 if build fails
- Test ad rendering in preview builds

### MEDIUM RISK Areas

#### 5. React 19 + React Native 0.79.5
**Risk**: Major version upgrades could introduce breaking changes

**Mitigation**:
- Test all navigation flows
- Test all Context providers
- Run full test suite (47 tests passing per git log)

#### 6. Expo Router v5.1.4
**Risk**: File-based routing changes could affect navigation

**Mitigation**:
- Test all routes (auth and protected)
- Verify deep linking still works
- Test tab navigation

### LOW RISK Areas

- TypeScript v5.8.3 (minor upgrade)
- Jest/Testing Library (stable)
- UI Components (no breaking changes expected)

---

## Database Migration Strategy

### Current Database Architecture

**Database File Location**: Device-specific (managed by expo-sqlite)

**Tables & Columns**:

```sql
-- records table
CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner INTEGER,
    date TEXT,
    animal TEXT,
    gestation_days INTEGER,
    tag TEXT,
    due_date TEXT,              -- Added via ALTER TABLE migration
    days_pregnant INTEGER,
    time_unit TEXT,
    calf_count INTEGER,
    pregnancy_status BOOLEAN,
    note TEXT,
    updated_at TEXT,
    server_session_id INTEGER,
    server_id INTEGER,          -- 0 = unposted, >0 = synced
    device_session_id INTEGER
);

-- sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    vet_name TEXT,
    server_session_id INTEGER,
    record_count INTEGER
);

-- weight_records table
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
);

-- weight_session table
CREATE TABLE IF NOT EXISTS weight_session (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    vet_name TEXT,
    server_session_id INTEGER,
    record_count INTEGER
);
```

### Migration Execution Flow

1. **App Launch**: `app/_layout.tsx` initializes `SQLiteProvider`
2. **Provider Init**: Calls `migrateDBifNeeded(db)` from `DatabaseUtils.tsx`
3. **Schema Creation**: Executes `CREATE TABLE IF NOT EXISTS` for all 4 tables
4. **Conditional Migration**: Checks for `due_date` column, adds if missing
5. **Ready**: App proceeds with existing data intact

### Migration Safety Checklist

**Before Deployment**:
- [ ] Verify `migrateDBifNeeded()` is idempotent (safe to run multiple times)
- [ ] Confirm no `DROP TABLE` or `DROP COLUMN` statements exist
- [ ] Test migration with mock data (see Testing Strategy)
- [ ] Verify all queries use column names explicitly (no `SELECT *` in critical paths)
- [ ] Check for any hardcoded column positions

**Post-Deployment Monitoring**:
- [ ] Monitor error logs for database-related crashes
- [ ] Check for reports of missing data
- [ ] Verify sync success rates remain consistent

### Database Version Tracking (Recommended for Future)

**Current State**: No version tracking

**Future Enhancement**:
```sql
-- Add to next migration
CREATE TABLE IF NOT EXISTS db_metadata (
    key TEXT PRIMARY KEY,
    value TEXT
);
INSERT OR IGNORE INTO db_metadata (key, value) VALUES ('schema_version', '1');
```

This would enable safer migrations for future updates.

---

## Automated Testing Strategy

### Current Test Coverage

**Existing Tests** (7 component tests in `components/__tests__/`):
- `Button.test.tsx` (8 tests)
- `TagInput.test.tsx`
- `StringInput.test.tsx`
- `SegmentedControl.test.tsx`
- `NumberInput.test.tsx`
- `NoteModal.test.tsx`
- `DateOrDuration.test.tsx`

**Test Framework**: Jest + React Testing Library + jest-expo preset

**Last Test Run**: Per git log, 47 tests passing, 0 failures

### Pre-Deployment Test Execution

#### 1. Run Existing Test Suite

```bash
# Run all tests
npm test -- --watchAll=false

# Expected: All tests pass (47 passing)
# Action if failures: Investigate and fix before proceeding
```

#### 2. Add Critical Path Tests (Recommended)

**Priority Test Cases** (add to `utilities/__tests__/DatabaseUtils.test.tsx`):

```typescript
// Test database migration with existing data
describe('DatabaseUtils - Migration', () => {
  it('migrates database without data loss', async () => {
    // Create old schema, insert data, run migration, verify data intact
  });

  it('handles due_date column addition idempotently', async () => {
    // Run migration twice, verify no errors
  });
});
```

**Priority Test Cases** (add to `contexts/__tests__/RecordSyncContext.test.tsx`):

```typescript
describe('RecordSyncContext - Unposted Records', () => {
  it('preserves unposted records across app restart', async () => {
    // Create unposted records, simulate app restart, verify still present
  });

  it('syncs unposted records when network becomes available', async () => {
    // Mock offline → online transition, verify sync triggered
  });
});
```

#### 3. Test Execution Timeline

**Pre-Build**:
```bash
npm test -- --watchAll=false --coverage
```

**Coverage Goals**:
- Existing: 100% pass rate maintained
- New tests (if added): 100% pass rate
- Coverage: >80% for DatabaseUtils, RecordSyncContext

---

## Manual Testing Checklist

### Phase 1: Development Build Testing

**Environment**: Dev client (`npx expo start --dev-client`)

#### Critical Path 1: Fresh Install (New User)
- [ ] Install dev build on clean device
- [ ] Register new account
- [ ] Create cow pregnancy record
- [ ] Create sheep/goat pregnancy record
- [ ] Create calf weight record
- [ ] Verify all records saved to database
- [ ] Check sync to server successful (server_id > 0)
- [ ] Verify PDF summary email received

#### Critical Path 2: Offline Functionality
- [ ] Create session while online
- [ ] Turn on airplane mode
- [ ] Add 5 pregnancy records offline
- [ ] Close app, reopen (verify session persists)
- [ ] Add 3 more records
- [ ] Turn off airplane mode
- [ ] Verify auto-sync occurs within 60 seconds
- [ ] Verify all 8 records have server_id > 0

#### Critical Path 3: Update Simulation (CRITICAL)
**Purpose**: Simulate Expo 52 → 53 update for existing users

**Setup**:
1. Build Expo 52 version (from previous commit/branch if available)
2. Install on test device
3. Create diverse data:
   - 3 synced pregnancy records (server_id > 0)
   - 2 unsynced pregnancy records (server_id = 0)
   - 2 synced weight records
   - 1 unsynced weight record
   - 1 active session in AsyncStorage
4. Record all data (screenshots + database export)

**Test**:
- [ ] Install Expo 53 build OVER Expo 52 (update, not fresh install)
- [ ] App launches without crash
- [ ] All 8 records still visible in UI
- [ ] Database query confirms all records present
- [ ] Active session restored from AsyncStorage
- [ ] Add new record to active session (works)
- [ ] Go online, verify sync completes for all unsynced records
- [ ] Verify due dates calculated correctly (due_date column migration worked)

**Validation**:
```bash
# If possible, use adb to extract database and inspect
adb shell run-as com.intricatech.pregcheck
cd databases
cat SQLite.db | sqlite3
SELECT COUNT(*) FROM records;  -- Should match pre-update count
SELECT COUNT(*) FROM weight_records;  -- Should match pre-update count
SELECT * FROM records WHERE server_id = 0;  -- Should sync after going online
```

#### Critical Path 4: All User Flows
- [ ] **Authentication**: Login, register, password reset
- [ ] **Navigation**: All tab navigation works
- [ ] **Pregnancy Scanning**:
  - [ ] Select animal type (cow, sheep, goat)
  - [ ] Select gestation period
  - [ ] Create records (empty, single, twins)
  - [ ] Edit record
  - [ ] Add notes
  - [ ] Finish session (batch sync)
- [ ] **Weight Recording**:
  - [ ] Create weight session
  - [ ] Add weight records (male/female)
  - [ ] Finish session (batch sync)
- [ ] **Search**:
  - [ ] Search by tag
  - [ ] Search by session
- [ ] **Summaries**:
  - [ ] View pregnancy summary
  - [ ] View weight summary
  - [ ] Request PDF email
- [ ] **Settings**: Theme toggle (light/dark), user info display

#### Critical Path 5: Edge Cases
- [ ] Extremely slow network (verify timeout handling)
- [ ] Network drops mid-sync (verify graceful failure)
- [ ] Create 100+ records in single session (performance test)
- [ ] App backgrounded during sync (verify resume on foreground)
- [ ] Battery saver mode enabled (verify background restrictions handled)

#### Critical Path 6: Platform-Specific
**Android**:
- [ ] AdMob banner ads display correctly
- [ ] Interstitial ads display at appropriate times
- [ ] Back button navigation works
- [ ] Deep linking works
- [ ] Permissions (if any) requested correctly

**iOS**:
- [ ] AdMob ads display correctly
- [ ] Safe area insets handled (notched devices)
- [ ] Tab bar navigation works
- [ ] Deep linking works

### Phase 2: Preview/Internal Testing

**Environment**: EAS preview build (`eas build --platform android --profile preview`)

**Testers**: Internal team + 5-10 beta testers

**Duration**: 1 week minimum

**Checklist**:
- [ ] All Critical Path 1-6 tests repeated on preview build
- [ ] Update simulation tested on at least 3 different Android devices
- [ ] Update simulation tested on at least 2 different iOS devices (TestFlight)
- [ ] Monitor for crashes (if crash reporting enabled)
- [ ] Collect tester feedback via form/survey

**Required Feedback**:
- Any crashes or freezes?
- Any missing data after update?
- Any sync failures?
- Any UI/UX issues?
- Overall app performance (speed, responsiveness)

### Phase 3: Beta Testing (Open Testing / TestFlight)

**Environment**: EAS production build, limited distribution

**Testers**: Expand to 20-50 real users (vets, farm managers)

**Duration**: 1-2 weeks

**Checklist**:
- [ ] Monitor crash rates (target: <0.1%)
- [ ] Monitor sync success rates (target: >99%)
- [ ] Monitor user feedback/reviews
- [ ] Check for data loss reports (target: 0)
- [ ] Verify offline functionality at scale

---

## Staged Deployment Plan

### Pre-Deployment Prerequisites

#### Code Preparation
- [ ] All automated tests passing (47/47)
- [ ] Manual testing checklist completed
- [ ] CLAUDE.md updated with production warnings
- [ ] Version number updated in app.json (currently 1.1.0 - verify this is correct)
- [ ] Production configuration verified:
  - [ ] API endpoint: pregcheck.ai (not localhost)
  - [ ] AdMob: Live ad IDs (not test IDs)
  - [ ] Email: Production SMTP config
  - [ ] Database: Server using Postgres (not SQLite)
  - [ ] Sync interval: 60 seconds (not shorter)

#### EAS Configuration
- [ ] `eas.json` profiles verified:
  - [ ] `preview`: Internal distribution
  - [ ] `production`: autoIncrement enabled
- [ ] Build credentials up to date:
  - [ ] Android keystore configured
  - [ ] iOS certificates/provisioning profiles valid

### Stage 1: Internal Testing (Week 1)

**Goal**: Validate build and basic functionality with internal team

#### Android: Play Store Internal Testing Track

**Build Command**:
```bash
eas build --platform android --profile preview
```

**Distribution**:
1. Upload APK to Play Store → Internal Testing track
2. Add internal testers (max 100 users)
3. Share internal testing link

**Validation Checklist**:
- [ ] Build completes successfully (watch for Kotlin/AdMob errors)
- [ ] APK installs on multiple devices (Pixel, Samsung, OnePlus)
- [ ] Update simulation works (install old version, update to new)
- [ ] All manual tests pass (see Manual Testing Checklist)
- [ ] No crashes reported
- [ ] Database migration successful

**Success Criteria**:
- 100% of manual tests pass
- 0 critical bugs
- 0 data loss incidents
- All testers report successful update

#### iOS: TestFlight Internal Testing

**Build Command**:
```bash
eas build --platform ios --profile development-ios  # For TestFlight
# Then submit:
eas submit --platform ios
```

**Distribution**:
1. Upload to TestFlight (auto-submits after `eas submit`)
2. Add internal testers
3. Wait for TestFlight review (~24-48 hours)

**Validation Checklist**:
- [ ] Build completes successfully
- [ ] IPA passes TestFlight review
- [ ] Installs on multiple devices (iPhone, iPad)
- [ ] Update simulation works
- [ ] All manual tests pass
- [ ] No crashes reported

**Success Criteria**:
- Same as Android

**Decision Point**: Proceed to Stage 2 only if BOTH Android and iOS pass all success criteria.

### Stage 2: Beta Testing (Week 2-3)

**Goal**: Validate with real users in production-like environment

#### Android: Open Testing Track

**Build Command**:
```bash
eas build --platform android --profile production
```

**Distribution**:
1. Upload AAB to Play Store → Open Testing track
2. Expand to 20-50 beta users (real vets/farm managers)
3. Share opt-in link publicly or via email

**Monitoring**:
- [ ] Daily check of crash rates (Play Console)
- [ ] Daily check of user reviews (Open Testing feedback)
- [ ] Monitor backend API logs for sync errors
- [ ] Check for support emails/messages

**Success Criteria**:
- Crash rate <0.5%
- No data loss reports
- Sync success rate >98%
- No showstopper bugs reported
- Positive or neutral user feedback

#### iOS: TestFlight External Testing

**Build Command**: (Same as Internal Testing)
```bash
eas build --platform ios --profile production-ios
eas submit --platform ios
```

**Distribution**:
1. Submit for TestFlight Beta Review (~24-48 hours)
2. Once approved, invite 20-50 external testers
3. Share TestFlight link via email

**Monitoring**: Same as Android

**Duration**: 1-2 weeks minimum (collect meaningful usage data)

**Decision Point**: Proceed to Stage 3 only if:
- Crash rate <0.5% sustained for 1 week
- No critical bugs reported
- Beta testers confirm successful updates from old version
- Backend team confirms no sync issues

### Stage 3: Phased Production Rollout (Week 4-7)

**Goal**: Gradually expose all users to minimize risk

#### Android: Production Rollout

**Build Command**: (Same build as Open Testing)
```bash
eas build --platform android --profile production
```

**Rollout Schedule**:
1. **5% rollout** (Day 1):
   - Upload to Play Store → Production track
   - Set staged rollout: 5%
   - Monitor closely for 48 hours

2. **20% rollout** (Day 3):
   - If no issues, increase to 20%
   - Monitor for 48-72 hours

3. **50% rollout** (Day 6):
   - Increase to 50%
   - Monitor for 3-5 days

4. **100% rollout** (Day 11-14):
   - Complete rollout to all users
   - Continue monitoring for 1 week

**Halt Criteria** (rollback immediately if):
- Crash rate exceeds 1%
- Any data loss reports
- Critical bug affecting core functionality
- Sync failure rate exceeds 5%

#### iOS: Production Rollout

**Build Command**: (Same as TestFlight)
```bash
eas build --platform ios --profile production-ios
eas submit --platform ios
```

**Submission**:
1. Submit to App Store Review (~24-48 hours)
2. Set "Release as soon as approved" OR "Manual release" (recommended)

**Rollout Options**:
- **Option A**: Phased Release (iOS 11+)
  - Day 1: 1% of users
  - Day 2: 2%
  - Day 3: 5%
  - Day 4: 10%
  - Day 5: 20%
  - Day 6: 50%
  - Day 7: 100%

- **Option B**: Manual release after review
  - Coordinate with Android rollout
  - Release to 100% once Android 50% is stable

**Recommended**: Option A (Phased Release) for safety

**Monitoring**:
- [ ] App Store Connect Analytics (crashes, ratings)
- [ ] Backend API logs (sync patterns)
- [ ] Support email volume
- [ ] User reviews/ratings

### Stage 4: Post-Deployment Monitoring (Week 8+)

**Duration**: 2-4 weeks of enhanced monitoring

**Metrics to Track**:
1. **Crash Rate**: <0.5% (Play Console + App Store Connect)
2. **ANR Rate** (Android): <0.1%
3. **Sync Success Rate**: >99% (backend logs)
4. **User Ratings**: Maintain ≥4.0 stars
5. **Support Tickets**: No increase from baseline
6. **Active Users**: No significant drop-off

**Daily Checklist**:
- [ ] Review crash reports (prioritize database/sync crashes)
- [ ] Check Play Store / App Store reviews
- [ ] Review backend error logs
- [ ] Check support email queue
- [ ] Verify sync metrics dashboard

**Weekly Checklist**:
- [ ] Analyze crash trends (any patterns?)
- [ ] Review user feedback themes
- [ ] Compare metrics to pre-deployment baseline
- [ ] Update stakeholders with rollout status

---

## Rollback Procedures

### When to Rollback

**Immediate Rollback Triggers**:
- Data loss reported by any user
- Crash rate exceeds 2%
- Critical security vulnerability discovered
- Database corruption observed
- Sync completely broken (failure rate >10%)

**Consider Rollback**:
- Crash rate 1-2% sustained for 24 hours
- Significant negative feedback trend
- Backend infrastructure issues
- Legal/compliance issue discovered

### Android Rollback Procedure

#### Option 1: Halt Staged Rollout
```
1. Go to Play Console → Production → Releases
2. Click "Halt rollout"
3. Users who haven't updated yet won't receive it
4. Users who updated are stuck on new version
```

**Limitations**: Cannot force users back to old version

#### Option 2: Emergency Release (Previous Version)
```
1. Retrieve previous APK/AAB (v1.0.x Expo 52)
2. Increment version number (e.g., 1.1.1)
3. Upload to Play Console as emergency release
4. Set 100% rollout immediately
5. Users will "update" back to old version with new version number
```

**Considerations**:
- Version number must be higher than current
- Users must manually update (not automatic)
- May confuse users with second update
- Database changes from v1.1.0 must be backward compatible

### iOS Rollback Procedure

#### Option 1: Halt Phased Release
```
1. Go to App Store Connect → My Apps → Pregcheck
2. Select version, click "Halt Phased Release"
3. Users who haven't updated yet won't receive it
```

**Limitations**: Cannot force users back to old version

#### Option 2: Emergency Release (Previous Version)
```
1. Retrieve previous IPA (v1.0.x Expo 52)
2. Increment build number
3. Submit to App Store as new version
4. Expedite review request (explain emergency)
5. Review typically faster for emergency releases (~12-24 hours)
```

**Considerations**: Same as Android

### Database Rollback Considerations

**Critical**: Expo 53 database changes must be backward compatible with Expo 52

**Current Migration** (DatabaseUtils.tsx line 152-162):
```typescript
// Adds due_date column if not exists
ALTER TABLE records ADD COLUMN due_date TEXT;
```

**Backward Compatibility Analysis**:
- ✅ **Safe**: ALTER TABLE ADD COLUMN is backward compatible
- ✅ Expo 52 app can read database with extra `due_date` column (will ignore it)
- ✅ No data loss if user rolls back to Expo 52
- ✅ If user updates again to Expo 53, column already exists (no issue)

**If Rollback Required**:
1. No database action needed (Expo 52 compatible)
2. Users may lose data entered in Expo 53 IF they rollback AND that data depends on new schema
3. Monitor for users reporting "missing records" after rollback

### Communication Plan for Rollback

**Internal**:
1. Notify development team immediately
2. Escalate to stakeholders
3. Assign incident commander
4. Begin root cause analysis

**External (Users)**:
1. Post to in-app notification (if available)
2. Social media announcement (if applicable)
3. Email to affected users (if possible to identify)
4. Update app store description with known issue warning

**Template**:
```
We've identified an issue with the latest app update (v1.1.0) affecting [describe issue].
We've temporarily paused the rollout and are working on a fix. If you've already updated
and are experiencing issues, please contact support at [email]. Your data is safe and we
expect to resolve this within [timeframe].
```

---

## Monitoring & Validation

### Key Performance Indicators (KPIs)

#### Application Health
| Metric | Target | Monitoring Tool | Alert Threshold |
|--------|--------|-----------------|-----------------|
| Crash Rate | <0.5% | Play Console / App Store Connect | >1% |
| ANR Rate (Android) | <0.1% | Play Console | >0.5% |
| App Launch Time | <3 seconds | Manual testing | >5 seconds |
| App Rating | ≥4.0 stars | Store reviews | <3.8 stars |

#### Data Integrity
| Metric | Target | Monitoring Tool | Alert Threshold |
|--------|--------|-----------------|-----------------|
| Sync Success Rate | >99% | Backend logs | <95% |
| Data Loss Reports | 0 | Support tickets | >0 |
| Database Errors | <0.1% | App logs | >0.5% |
| Offline Record Preservation | 100% | Manual testing | <100% |

#### User Engagement
| Metric | Baseline | Monitoring Tool | Alert Threshold |
|--------|----------|-----------------|-----------------|
| Daily Active Users | [Current] | Backend analytics | -20% from baseline |
| Records Created per Day | [Current] | Backend analytics | -30% from baseline |
| Sessions per User | [Current] | Backend analytics | -20% from baseline |

### Monitoring Tools

#### 1. Play Console (Android)
**URL**: https://play.google.com/console

**What to Monitor**:
- **Crashes & ANRs**: Pre-launch → Crashes & ANRs
- **Ratings & Reviews**: Grow → Ratings and reviews
- **Statistics**: Track installs, uninstalls, active devices

**Alert Setup**: Enable email notifications for:
- Spike in crash rate
- New critical reviews (1-2 stars)

#### 2. App Store Connect (iOS)
**URL**: https://appstoreconnect.apple.com

**What to Monitor**:
- **Crashes**: TestFlight / App Analytics → Crashes
- **Ratings & Reviews**: App Store → Ratings and Reviews
- **Analytics**: Metrics → Crashes, usage

**Alert Setup**: Enable notifications in App Store Connect → Users and Access → Your Profile

#### 3. Backend Monitoring (pregcheck.ai)

**Metrics to Track**:
```sql
-- Daily sync success rate
SELECT
    DATE(created_at) as date,
    COUNT(*) as total_syncs,
    SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_syncs,
    (SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as success_rate
FROM sync_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Records created per day (detect drop-offs)
SELECT
    DATE(created_at) as date,
    COUNT(*) as records_created
FROM exam_records
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- API error rates
SELECT
    DATE(timestamp) as date,
    status_code,
    COUNT(*) as request_count
FROM api_logs
WHERE timestamp >= NOW() - INTERVAL '7 days'
  AND status_code >= 400
GROUP BY DATE(timestamp), status_code
ORDER BY date DESC, request_count DESC;
```

**Recommended**: Set up automated dashboard (e.g., Grafana, Metabase)

#### 4. Support Channel Monitoring

**Channels**:
- Support email inbox
- App store reviews/responses
- Social media mentions (if applicable)

**Daily Review**:
- Scan for keywords: "crash", "lost data", "sync failed", "update broke", "missing records"
- Prioritize any data loss reports
- Respond to critical issues within 24 hours

### Validation Checkpoints

#### Day 1-2 After Each Stage
- [ ] Review crash reports (any new patterns?)
- [ ] Check first 20 user reviews
- [ ] Verify sync rates remain stable
- [ ] Scan support emails for critical issues

#### Week 1 After Production Release
- [ ] Compare all KPIs to baseline
- [ ] Analyze crash reports by device/OS version
- [ ] Review all 1-2 star reviews
- [ ] Confirm no data loss reports
- [ ] Validate database migration success rate

#### Week 2-4 After Production Release
- [ ] Weekly KPI review
- [ ] Trend analysis (improving or degrading?)
- [ ] User feedback sentiment analysis
- [ ] Plan for next update (bug fixes if needed)

### Success Criteria for Deployment

**Stage 1 → Stage 2**:
- All manual tests pass
- 0 critical bugs
- 0 data loss incidents
- Internal team approval

**Stage 2 → Stage 3**:
- Crash rate <0.5% for 1 week
- Sync success >98%
- No showstopper bugs
- Positive beta feedback

**Stage 3 → Complete**:
- Crash rate <0.5% sustained
- User ratings stable or improving
- No increase in support volume
- Sync rates normal
- 100% rollout achieved

### Post-Deployment Report Template

**After 30 days**, compile deployment report:

```markdown
# Expo 53 Deployment Report

**Deployment Date**: [Start date] - [End date]
**Final Version**: 1.1.0

## Metrics Summary
- Total Users Updated: [number] ([% of user base])
- Crash Rate: [%]
- Sync Success Rate: [%]
- Data Loss Incidents: [number]
- Average Rating: [stars]
- Support Tickets: [number] ([% change from baseline])

## Issues Encountered
1. [Issue description] - [Severity] - [Resolution]
2. [Issue description] - [Severity] - [Resolution]

## Lessons Learned
- [What went well]
- [What could be improved]
- [Recommendations for next deployment]

## Rollback Events
- [None] OR [Description of rollback and reason]

## User Feedback Highlights
- [Positive feedback themes]
- [Negative feedback themes]

## Next Steps
- [Planned bug fixes]
- [Feature improvements based on feedback]
- [Technical debt to address]
```

---

## Appendix: Quick Reference Commands

### Testing Commands
```bash
# Run all tests
npm test -- --watchAll=false

# Run specific test file
npm test -- ComponentName.test.tsx

# Run tests with coverage
npm test -- --watchAll=false --coverage
```

### Build Commands
```bash
# Android preview (internal testing)
eas build --platform android --profile preview

# iOS preview (TestFlight internal)
eas build --platform ios --profile development-ios
eas submit --platform ios

# Android production (Play Store)
eas build --platform android --profile production

# iOS production (App Store)
eas build --platform ios --profile production-ios
eas submit --platform ios
```

### Debug Commands
```bash
# Android USB debugging
adb devices
adb logcat -c
adb logcat | grep --line-buffered -E "pregcheck|AndroidRuntime|CRASH"

# Extract database from Android device (if rooted/debuggable)
adb shell run-as com.intricatech.pregcheck
cd databases
ls -la
```

### Development Commands
```bash
# Start dev server
npx expo start

# Start with dev client
npx expo start --dev-client -c

# Clear cache
npx expo start -c
```

---

## Document History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-10-15 | 1.0 | Initial strategy document | Claude Code |

---

## Approval Sign-off

**Before proceeding with deployment, obtain sign-off from**:

- [ ] Technical Lead: __________________ Date: __________
- [ ] Product Owner: __________________ Date: __________
- [ ] QA Lead: _______________________ Date: __________

**Post-deployment review completed by**:

- [ ] Technical Lead: __________________ Date: __________

---

**END OF DOCUMENT**
