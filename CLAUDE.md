# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## ⚠️ CRITICAL: PRODUCTION APPLICATION WITH ACTIVE USERS

**This is a PRODUCTION application currently deployed to the Google Play Store and Apple App Store with active users on physical devices.**

### Mandatory Requirements for ALL Changes:

1. **Update Compatibility**: All code changes MUST function as updates to existing installed applications. Users will receive app updates - not fresh installs. Test accordingly.

2. **Database Migrations**: This app uses SQLite WITHOUT Drizzle or migration libraries. Any database schema changes must:
   - Be additive only (new columns, new tables) - NEVER remove or rename existing columns
   - Use `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` patterns
   - Include version checks in `utilities/DatabaseUtils.tsx:migrateDBifNeeded()`
   - Be tested with existing production data schemas
   - Support backward compatibility with previous versions during phased rollouts

3. **Data Preservation**: User data (pregnancy records, weight records, sessions) is sacred. ANY code touching:
   - `utilities/DatabaseUtils.tsx`
   - `contexts/RecordContext.tsx` or `contexts/WeightRecordContext.tsx`
   - `contexts/RecordSyncContext.tsx`
   - `services/RecordSyncService.tsx`

   Must be extensively tested for data integrity and backward compatibility.

4. **Offline-First Architecture**: This app works offline. Changes must not break offline functionality or sync logic.

5. **Prohibited Commands**: Claude Code is FORBIDDEN from executing:
   - `git commit`, `git push`, or any git commands
   - `eas build` or `eas submit` commands
   - These are reserved for human oversight due to production impact

6. **Current Status**: App recently upgraded from Expo 52 → Expo 53 to comply with Google Play's 16 KB memory page size requirement (Nov 1, 2025 deadline). See `EXPO_53_DEPLOYMENT_STRATEGY.md` for deployment plan.

### Before Making Any Changes:
- Read `EXPO_53_DEPLOYMENT_STRATEGY.md` for deployment context
- Consider impact on existing user data
- Plan for incremental rollout via Internal Testing/TestFlight before production
- Add comprehensive tests for any database or state management changes

---

## Project Overview

**Pregcheck** is an offline-first React Native mobile application (Expo) for veterinarians and farm managers to record livestock pregnancy scan results and calf weight measurements. The app supports cattle, sheep, and goats with session-based workflows and server synchronization.

**Tech Stack**: Expo 53, React Native 0.79.5, TypeScript, React 19, expo-sqlite, expo-router

## Development Commands

### Running the app
```bash
npm install                    # Install dependencies
npx expo start                 # Start development server
npx expo start --dev-client -c  # Start with development client (cleared cache)
```

### Testing
```bash
npm test                       # Run tests in watch mode
jest --watchAll                # Alternative test command
npm test -- ComponentName.test.tsx  # Run specific test file
```

### Linting
```bash
npm run lint                   # Run ESLint
```

### Building

**Development builds** (with dev client):
```bash
eas build -p android --profile development
eas build -p ios --profile development-ios
```

**Preview builds** (Android APK for testing):
```bash
eas build --platform android --profile preview
```

**Production builds**:
```bash
eas build --platform android --profile production    # Play Store AAB
eas build -p ios --profile production-ios            # TestFlight IPA
eas submit --platform ios                            # Submit to App Store
```

**Android release variant** (for e2e testing):
```bash
npx expo run:android --variant release
```

### Debugging Android USB
```bash
adb devices                    # Confirm device connected
adb logcat -c                  # Clear logs
adb logcat | grep --line-buffered -E "pregcheck|AndroidRuntime|CRASH"
```

## Architecture Overview

### State Management

Context-based architecture with multiple specialized providers:

1. **AuthContext** (`contexts/AuthContext.tsx`)
   - User authentication, token management, route protection
   - Methods: `login()`, `register()`, `logout()`, `requestPasswordReset()`

2. **RecordContext** (`contexts/RecordContext.tsx`)
   - Pregnancy scan record management
   - Session-based workflow: create session → add records → batch sync
   - Methods: `persistRecord()`, `commitRecord()`, `createSession()`, `handleFinished()`

3. **WeightRecordContext** (`contexts/WeightRecordContext.tsx`)
   - Calf weight record management (parallel structure to RecordContext)

4. **RecordSyncContext** (`contexts/RecordSyncContext.tsx`)
   - Offline-first sync logic
   - Tracks unposted records, network status, batch operations
   - Critical for offline functionality

5. **StatsContext** (`contexts/StatsContext.tsx`)
   - Real-time statistics: total counts, pregnancy rates, singles/twins

6. **ThemeContext** (`contexts/ThemeContext.tsx`)
   - Light/dark mode theming

7. **ErrorContext** (`contexts/ErrorContext.tsx`)
   - Global error message handling

### Database Layer

**SQLite** (`expo-sqlite`) with four tables:
- `records` & `sessions`: Pregnancy scan data
- `weight_records` & `weight_session`: Weight measurement data

**Key concepts**:
- **Device PKs**: Generated locally for immediate storage
- **Server PKs**: Populated after successful sync
- **Dual key system**: Enables offline-first with eventual server reconciliation

**Database utilities**: `utilities/DatabaseUtils.tsx`
- All CRUD operations, schema migrations
- Methods: `insertRecord()`, `getRecordsBySessionId()`, `updateRecordWithServerIds()`

### API Layer

**ApiService** (`services/ApiService.ts`)
- Enhanced API client with retry logic, error handling
- Offline detection via NetInfo
- Consistent error response format
- Used for all server communication (pregcheck.ai backend)

**RecordSyncService** (`services/RecordSyncService.tsx`)
- Orchestrates batch sync operations
- Groups records by session before posting
- Updates local DB with server response data

### Routing & Navigation

**Expo Router** (file-based routing in `app/` directory):
- Route groups: `(auth)` for public routes, `(protected)` for authenticated
- Root layout: `app/_layout.tsx` (provider hierarchy)
- Home screen: `app/(protected)/index.tsx`
- Type-safe routing enabled via TypedRoutes

### Session-Based Workflow

1. User selects animal type and gestation days → `app/(protected)/gestation_days.tsx`
2. Create device session (stored in AsyncStorage)
3. Add records to session → `create_cow_record.tsx`, `create_sheep_goat_record.tsx`
4. Session persists if app restarts
5. On "Finish": batch sync all records to server
6. Reset state for next session

### Offline-First Pattern

```
User creates record → Save to SQLite immediately (device_pk)
                   → Mark as unposted
                   → On network available → Batch sync
                   → Update with server_pk
                   → Mark as posted
```

## Directory Structure

```
app/                          # Expo Router pages (file-based routing)
  ├── (auth)/                # Public: login, register, password reset
  └── (protected)/           # Authenticated: home, record screens, settings

components/                   # Reusable UI components (27+ with tests)
  ├── __tests__/            # Component test files
  ├── Button.tsx, StringInput.tsx, NumberInput.tsx, TagInput.tsx
  ├── RecordCard.tsx, RecordTable.tsx, WeightRecordTable.tsx
  └── ModalConfirm.tsx, ErrorBanner.tsx, Navbar.tsx

contexts/                     # React Context providers (state management)

services/                     # API communication & sync logic
  ├── ApiService.ts         # HTTP client with retry/error handling
  ├── RecordSyncService.tsx # Offline sync orchestration
  └── adService.js          # Google AdMob initialization

utilities/                    # Helper functions
  ├── DatabaseUtils.tsx     # SQLite CRUD operations
  ├── AuthUtils.tsx         # Token storage/retrieval
  └── helpers.ts            # Parser functions (DB → domain models)

constants/                    # Types, interfaces, enums
  ├── Types.ts              # AnimalType, TimeUnit, gestation periods
  ├── Interfaces.ts         # TypeScript interfaces
  └── constants.ts          # App constants (weight limits, colors)

hooks/                        # Custom React hooks
  ├── useTheme.tsx          # Access theme colors
  └── useToast.tsx          # Toast notifications
```

## Common Development Tasks

### Adding a new screen
1. Create `.tsx` file in `app/(protected)/` for authenticated routes
2. File name becomes the route (e.g., `settings.tsx` → `/settings`)
3. Import and use contexts as needed

### Adding a new component
1. Create component in `components/`
2. Create test file in `components/__tests__/`
3. Use TypeScript for props interface
4. Import theme via `useTheme()` hook

### Modifying database schema
1. Update schema in `DatabaseUtils.migrateDBifNeeded()`
2. Increment DB version number
3. Add migration logic for existing users
4. Test with existing data

### Adding API endpoints
1. Add method to `ApiService.ts`
2. Use `api.post()` or `api.get()` with error handling
3. Update sync logic in `RecordSyncContext.tsx` if needed

### Testing components
```bash
npm test -- ComponentName.test.tsx
```
Test files use `@testing-library/react-native` with `jest-expo` preset.

## Key Files to Review First

When starting work on this codebase, review these files in order:

1. `app/_layout.tsx` - Provider hierarchy and app initialization
2. `app/(protected)/index.tsx` - Home screen logic and navigation
3. `contexts/RecordContext.tsx` - Core record management state
4. `utilities/DatabaseUtils.tsx` - Database operations and schema
5. `services/ApiService.ts` - API communication patterns
6. `contexts/RecordSyncContext.tsx` - Offline sync implementation

## Production Deployment Checklist

Before deploying to production, verify:
- Connected to pregcheck.ai for API requests
- Unposted record check interval > 1 minute (not development frequency)
- Live AdMob ads (not test IDs)
- Live email configuration enabled
- Backend: `USE_SERVER_POSTGRES = True`

## Known Issues & Notes

### React Native Google Mobile Ads
- Current version: 15.4.0
- If Kotlin compile errors occur, downgrade to 14.7.2
- See: [stackoverflow.com/questions/77433573](https://stackoverflow.com/questions/77433573/react-native-google-ads-kotlin-compile-error/79558626#79558626)

### AdMob Test IDs
- Banner: `ca-app-pub-3940256099942544/6300978111`
- Interstitial: `ca-app-pub-3940256099942544/1033173712`

## Additional Context

### User Type Display
Per user instructions: Add the user type to the display on the home screen (`app/(protected)/index.tsx`). User information is available from AuthContext but may need additional UI component.

### Code Style
- Use TypeScript for all new files
- Prefer functional components with hooks
- Use Context API for state (not Redux)
- Follow existing component patterns in `components/`
- Test coverage required for new components
