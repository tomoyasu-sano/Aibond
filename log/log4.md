# console log

forward-logs-shared.ts:95 [Fast Refresh] rebuilding
forward-logs-shared.ts:95 [Fast Refresh] done in 297ms
page.tsx:191  DELETE http://localhost:3000/api/account 500 (Internal Server Error)
handleDeleteAccount @ page.tsx:191
handleEvent @ primitive.tsx:17
executeDispatch @ react-dom-client.development.js:20541
runWithFiberInDEV @ react-dom-client.development.js:984
processDispatchQueue @ react-dom-client.development.js:20591
(anonymous) @ react-dom-client.development.js:21162
batchedUpdates$1 @ react-dom-client.development.js:3375
dispatchEventForPluginEventSystem @ react-dom-client.development.js:20745
dispatchEvent @ react-dom-client.development.js:25671
dispatchDiscreteEvent @ react-dom-client.development.js:25639Understand this error
page.tsx:208 Error deleting account: Error: Failed to delete auth user
    at handleDeleteAccount (page.tsx:197:15)
error @ intercept-console-error.ts:42
handleDeleteAccount @ page.tsx:208
await in handleDeleteAccount
handleEvent @ primitive.tsx:17
executeDispatch @ react-dom-client.development.js:20541
runWithFiberInDEV @ react-dom-client.development.js:984
processDispatchQueue @ react-dom-client.development.js:20591
(anonymous) @ react-dom-client.development.js:21162
batchedUpdates$1 @ react-dom-client.development.js:3375
dispatchEventForPluginEventSystem @ react-dom-client.development.js:20745
dispatchEvent @ react-dom-client.development.js:25671
dispatchDiscreteEvent @ react-dom-client.development.js:25639Understand this error

# server log
 ✓ Starting...

 ✓ Ready in 745ms

 GET /settings 200 in 1406ms (compile: 719ms, proxy.ts: 427ms, render: 260ms)
 GET /api/talks 200 in 1336ms (compile: 1835µs, proxy.ts: 329ms, render: 1005ms)
[Usage] Created new period usage for user d5d75c33-30fc-49df-8f7b-a309f7a4f190: 2025-12, limit: 120 minutes
Profile API - User ID: d5d75c33-30fc-49df-8f7b-a309f7a4f190
Profile API - Partnership: null
Profile API - Partnership error: {
  code: 'PGRST116',
  details: 'The result contains 0 rows',
  hint: null,
  message: 'Cannot coerce the result to a single JSON object'
}
Profile API - Subscription data: {
  id: '05babcfc-2aa0-4823-a7e6-ba7a04b9a42e',
  user_id: 'd5d75c33-30fc-49df-8f7b-a309f7a4f190',
  plan: 'free',
  status: 'active',
  stripe_customer_id: null,
  stripe_subscription_id: null,
  current_period_end: null,
  cancel_at_period_end: false,
  scheduled_plan: null,
  created_at: '2025-12-11T20:05:11.047522+00:00',
  updated_at: '2025-12-11T20:05:11.047522+00:00'
}
 GET /api/profile 200 in 4.2s (compile: 200ms, proxy.ts: 376ms, render: 3.6s)
 GET /api/talks 200 in 1425ms (compile: 6ms, proxy.ts: 381ms, render: 1038ms)
 GET /api/talks 200 in 1627ms (compile: 3ms, proxy.ts: 399ms, render: 1225ms)
[Account Delete] Starting deletion for user: d5d75c33-30fc-49df-8f7b-a309f7a4f190
[Account Delete] AI consultations anonymized with anonymous_user_id: dd916b57-9431-4fbd-a9c7-3b2955fb28c9
 GET /api/talks 200 in 1443ms (compile: 5ms, proxy.ts: 327ms, render: 1111ms)
[Account Delete] Auth data delete error: {
  code: '42883',
  details: null,
  hint: 'No operator matches the given name and argument types. You might need to add explicit type casts.',
  message: 'operator does not exist: uuid = text'
}
[Account Delete] Auth delete error: Error [AuthApiError]: Database error deleting user
    at async DELETE (src/app/api/account/route.ts:241:34)
  239 |
  240 |     // 12. Supabase Auth からユーザーを削除
> 241 |     const { error: authError } = await adminSupabase.auth.admin.deleteUser(userId);
      |                                  ^
  242 |
  243 |     if (authError) {
  244 |       console.error("[Account Delete] Auth delete error:", authError); {
  __isAuthError: true,
  status: 500,
  code: 'unexpected_failure'
}
 DELETE /api/account 500 in 7.1s (compile: 297ms, proxy.ts: 379ms, render: 6.5s)