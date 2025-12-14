# comsole error
GET http://localhost:3000/api/stt/stream?sessionId=session-1765697960483-zmulm8r0r&talkId=145ca49e-810a-4c6b-8535-92b47d50ec6a 500 (Internal Server Error)

# server error
npm run dev

> web@0.1.0 dev
> next dev

   ▲ Next.js 16.0.7 (Turbopack)
   - Local:         http://localhost:3000
   - Network:       http://192.168.0.205:3000
   - Environments: .env.local
   - Experiments (use with caution):
     · serverActions

 ✓ Starting...
 ✓ Ready in 975ms
 GET /partners 200 in 3.8s (compile: 2.7s, proxy.ts: 820ms, render: 276ms)
 GET /api/partners/invite 200 in 1738ms (compile: 340ms, proxy.ts: 396ms, render: 1003ms)
 GET /api/partners 200 in 1750ms (compile: 336ms, proxy.ts: 339ms, render: 1075ms)
 GET /api/talks 200 in 2.2s (compile: 254ms, proxy.ts: 403ms, render: 1497ms)
Profile API - User ID: d3ea32e1-c613-4ac8-92f1-8eea28d71275
Profile API - Partnership: null
Profile API - Partnership error: {
  code: 'PGRST116',
  details: 'The result contains 0 rows',
  hint: null,
  message: 'Cannot coerce the result to a single JSON object'
}
Profile API - Subscription data: {
  id: '53a2c9a3-fa90-4cfb-a407-b0c76593681d',
  user_id: 'd3ea32e1-c613-4ac8-92f1-8eea28d71275',
  plan: 'free',
  status: 'active',
  stripe_customer_id: null,
  stripe_subscription_id: null,
  current_period_end: null,
  cancel_at_period_end: false,
  scheduled_plan: null,
  created_at: '2025-12-11T18:37:00.121174+00:00',
  updated_at: '2025-12-11T18:37:00.121174+00:00'
}
 GET /api/profile 200 in 3.4s (compile: 310ms, proxy.ts: 398ms, render: 2.7s)
 GET /api/talks 200 in 1570ms (compile: 3ms, proxy.ts: 439ms, render: 1129ms)
 GET /api/talks 200 in 1384ms (compile: 5ms, proxy.ts: 383ms, render: 996ms)
 GET /dashboard 200 in 4.5s (compile: 1207ms, proxy.ts: 406ms, render: 2.9s)
 GET /api/sentiments?period=90&limit=10&status=completed 200 in 1218ms (compile: 91ms, proxy.ts: 464ms, render: 663ms)
 GET /api/talks 200 in 1506ms (compile: 7ms, proxy.ts: 449ms, render: 1049ms)
 GET /talks 200 in 691ms (compile: 348ms, proxy.ts: 332ms, render: 11ms)
 GET /api/sentiments?period=90&limit=10&status=completed 200 in 991ms (compile: 1175µs, proxy.ts: 330ms, render: 660ms)
 GET /api/talks 200 in 1444ms (compile: 2ms, proxy.ts: 385ms, render: 1056ms)
 GET /api/talks 200 in 1523ms (compile: 4ms, proxy.ts: 379ms, render: 1140ms)
 GET /api/talks 200 in 1334ms (compile: 3ms, proxy.ts: 335ms, render: 996ms)
 POST /api/talks 200 in 1785ms (compile: 4ms, proxy.ts: 335ms, render: 1446ms)
 GET /talks/145ca49e-810a-4c6b-8535-92b47d50ec6a 200 in 1055ms (compile: 709ms, proxy.ts: 335ms, render: 10ms)
 GET /api/talks 200 in 1544ms (compile: 1809µs, proxy.ts: 415ms, render: 1127ms)
 GET /api/talks 200 in 1559ms (compile: 2ms, proxy.ts: 402ms, render: 1155ms)
 GET /api/talks/145ca49e-810a-4c6b-8535-92b47d50ec6a 200 in 3.5s (compile: 2.0s, proxy.ts: 356ms, render: 1156ms)
 GET /api/talks/145ca49e-810a-4c6b-8535-92b47d50ec6a 200 in 1660ms (compile: 16ms, proxy.ts: 402ms, render: 1242ms)
[STT Stream] New connection request {
  sessionId: 'session-1765697960483-zmulm8r0r',
  talkId: '145ca49e-810a-4c6b-8535-92b47d50ec6a'
}
 GET /api/talks 200 in 1439ms (compile: 1219µs, proxy.ts: 404ms, render: 1034ms)
[STT Stream] Talk data {
  talkData: {
    partnership_id: null,
    owner_user_id: 'd3ea32e1-c613-4ac8-92f1-8eea28d71275'
  },
  talkError: null
}
[STT Stream] No partnership_id found for this talk
[STT Stream] Languages { sourceLanguage: 'ja', targetLanguage: null }
[STT Stream] Credentials not found
 GET /api/stt/stream?sessionId=session-1765697960483-zmulm8r0r&talkId=145ca49e-810a-4c6b-8535-92b47d50ec6a 500 in 1604ms (compile: 629ms, proxy.ts: 326ms, render: 649ms)
 GET /api/talks 200 in 1512ms (compile: 3ms, proxy.ts: 386ms, render: 1123ms)
 GET /api/talks 200 in 1972ms (compile: 9ms, proxy.ts: 404ms, render: 1558ms)
 GET /talks/145ca49e-810a-4c6b-8535-92b47d50ec6a 200 in 454ms (compile: 9ms, proxy.ts: 339ms, render: 105ms)
 GET /api/talks/145ca49e-810a-4c6b-8535-92b47d50ec6a 200 in 1447ms (compile: 19ms, proxy.ts: 416ms, render: 1013ms)
 GET /api/talks 200 in 1451ms (compile: 2ms, proxy.ts: 413ms, render: 1035ms)