# Known Issues

## expo-sqlite v15.2.14 Connection Invalidation Bug

**Status**: Unresolved - Library Bug
**Affected**: Production builds (Hermes engine) on Android
**Severity**: High - Causes database to become completely unusable
**Workaround**: Force-close and restart app

### Description

The expo-sqlite native database connection can become invalidated (`java.lang.NullPointerException`) in production builds, causing ALL subsequent database operations to fail. This is NOT caused by our transaction management or code - it's a bug in expo-sqlite v15.2.14's connection lifecycle management.

### Error Signature

```
Error: Call to function 'NativeDatabase.prepareAsync' has been rejected.
→ Caused by: java.lang.NullPointerException: java.lang.NullPointerException
code: 'ERR_UNEXPECTED'
```

### When It Occurs

- Between sessions (not during active operations)
- After app has been running for some time
- Seemingly random, but more common after:
  - App backgrounding/foregrounding cycles
  - Multiple rapid sessions
  - Network connectivity changes

### Impact

Once the connection becomes null:
- ❌ `createLocalSession()` fails
- ❌ `addLocalRecord()` fails
- ❌ `getAllAsync()` fails
- ❌ `runAsync()` fails
- ❌ `getFirstAsync()` fails (even `SELECT 1`)
- ❌ ALL database operations fail

The `useSQLiteContext()` hook continues returning a database object, but the underlying native connection is dead.

### Current Mitigation

Our code now:
1. ✅ Detects when database becomes inaccessible
2. ✅ Prevents crashes by catching errors
3. ✅ Sends data to server BEFORE attempting database updates
4. ✅ Shows user-friendly error messages
5. ✅ Preserves data on server even if local DB fails

**User must force-close and restart app to recover.**

### Code Evidence

From production logs (2025-10-17):
```
13:12:38 Creating new session
13:12:38 Error adding local session: NullPointerException
13:12:40 Error adding local record: NullPointerException
13:12:46 Database connection check failed: NullPointerException
13:13:01 Error fetching unposted records: NullPointerException
```

All operations fail with same native-layer null pointer error.

### Fixes Attempted

- ✅ Switched to `withExclusiveTransactionAsync()` (proper API usage)
- ✅ Added connection health checks
- ✅ Added `onError` handler to SQLiteProvider
- ✅ Graceful degradation on DB failures
- ✅ **TESTING: Added `useNewConnection: true` option** (based on GitHub issue #28176)
- ❌ Cannot prevent native connection from becoming null without above workaround

### Related Issues

- **Expo GitHub Issue #28176**: Exact same error signature
  - Fixed in PR #27748 for SDK 50/51
  - Workaround: `useNewConnection: true` in SQLiteProvider options
  - May be a regression in SDK 53 / expo-sqlite v15.2.14
- Expo GitHub Issue #37169: Different issue (multiple connections)
- Likely related to connection pooling or cleanup in production builds
- Does not occur in development builds

### Potential Fix (Testing)

Based on GitHub issue #28176, we've implemented:
```typescript
<SQLiteProvider
  databaseName="pregcheck_db"
  options={{ useNewConnection: true }}
>
```

This forces expo-sqlite to create a new connection instead of reusing cached connections, which may prevent the native connection from becoming null.

### Recommendation

Monitor for expo-sqlite updates beyond v15.2.14 that may fix this issue. Consider filing detailed bug report with Expo team if not already reported.

### Workaround for Users

When database errors occur:
1. Session data IS saved on server (email sent)
2. Local database sync will fail
3. User must force-close app and restart
4. Next session will work normally

**Data is NOT lost** - server has the records even if local DB update fails.
