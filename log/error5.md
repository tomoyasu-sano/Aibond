# server log
[Account Delete] AI consultations anonymized with anonymous_user_id: 8c7fbf99-3062-4ce1-9055-cf9d7a9432fe
[Account Delete] Auth data delete error: {
  code: '23503',
  details: 'Key (id)=(d5d75c33-30fc-49df-8f7b-a309f7a4f190) is still referenced from table "talks".',
  hint: null,
  message: 'update or delete on table "users" violates foreign key constraint "talks_speaker2_user_id_fkey" on table "talks"'
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
 DELETE /api/account 500 in 6.1s (compile: 6ms, proxy.ts: 336ms, render: 5.8s)
 GET /api/talks 200 in 1426ms (compile: 1474µs, proxy.ts: 338ms, render: 1087ms)
 GET /api/talks 200 in 1571ms (compile: 3ms, proxy.ts: 335ms, render: 1234ms)