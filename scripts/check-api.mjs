import assert from "node:assert/strict";
const url =
  process.env.VITE_SUPABASE_URL || "https://sccztuzamxnocyzefhaj.supabase.co";
const key =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_r88Q_9DZPgWYHoBkBTxbYw_igC6Jawh";
const headers = { apikey: key };
const settingsResponse = await fetch(`${url}/auth/v1/settings`, { headers });
assert.equal(settingsResponse.status, 200, "Auth endpoint is available");
const settings = await settingsResponse.json();
assert.equal(settings.external.email, true, "Email Auth must be enabled");
assert.equal(settings.disable_signup, false, "Registration must be enabled");
for (const table of [
  "profiles",
  "habits",
  "completions",
  "classes",
  "goals",
  "journals",
]) {
  const response = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, {
    headers,
  });
  assert.ok(
    response.status === 401 || response.status === 403,
    `${table} must reject unauthenticated requests`,
  );
}
const rpc = await fetch(`${url}/rest/v1/rpc/initialize_frroutine`, {
  method: "POST",
  headers: { ...headers, "Content-Type": "application/json" },
  body: "{}",
});
assert.ok(
  rpc.status === 401 || rpc.status === 403,
  "Initialization requires authentication",
);
console.log(
  "PASS: email authentication, registration, anonymous table access, authenticated-only initialization.",
);
console.log(`Email confirmation required: ${!settings.mailer_autoconfirm}`);
