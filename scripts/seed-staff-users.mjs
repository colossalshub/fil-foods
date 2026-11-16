/**
 * One-time / repeatable staff Auth + profiles.role bootstrap for live staff ↔ user order sync.
 *
 * From repo root (requires service role — never put this key in Expo):
 *   set SUPABASE_SERVICE_ROLE_KEY=sb_secret_...   (or legacy eyJ... service_role JWT)
 *   node scripts/seed-staff-users.mjs
 *
 * Uses EXPO_PUBLIC_SUPABASE_URL from frontend/.env when present.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const require = createRequire(resolve(ROOT, 'frontend/package.json'));
const { createClient } = require('@supabase/supabase-js');

const STAFF_PASSWORD = 'Admin@2026';

const STAFF = [
  { email: 'admin@filfoods.ph', role: 'owner_admin', firstName: 'Admin', lastName: 'Account' },
  { email: 'maria.santos@filfoods.ph', role: 'dietitian_staff', firstName: 'Maria', lastName: 'Santos' },
  { email: 'juan.delacruz@filfoods.ph', role: 'kitchen_staff', firstName: 'Juan', lastName: 'Dela Cruz' },
  { email: 'ana.reyes@filfoods.ph', role: 'delivery_staff', firstName: 'Ana', lastName: 'Reyes' },
  { email: 'mark.peralta@filfoods.ph', role: 'delivery_staff', firstName: 'Mark', lastName: 'Peralta' },
];

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, 'utf8');
  text.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) return;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  });
}

loadEnvFile(resolve(ROOT, 'frontend', '.env'));

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!url || !serviceKey) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL (frontend/.env) or admin key env var.');
  console.error('Dashboard: Settings > API Keys > default > copy the Secret key (sb_secret_...).');
  console.error('Legacy projects: use service_role JWT (eyJ...) on the Legacy tab.');
  process.exit(1);
}

const key = serviceKey.trim();
if (key.includes('<') || key.includes('service_role from') || !/^[\x20-\x7e]+$/.test(key)) {
  console.error('Admin key must be the real secret from the dashboard (ASCII only).');
  console.error('Use default Secret (sb_secret_...) or legacy service_role (eyJ...), not publishable.');
  process.exit(1);
}
if (!key.startsWith('eyJ') && !key.startsWith('sb_secret_')) {
  console.error('Expected sb_secret_... (new) or eyJ... (legacy service_role). You may have copied the publishable key.');
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserIdByEmail(email) {
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const hit = data.users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase());
    if (hit) return hit.id;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function ensureStaffUser({ email, role, firstName, lastName }) {
  let userId = await findUserIdByEmail(email);
  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: STAFF_PASSWORD,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        auth_provider: 'password',
      },
    });
    if (error) throw new Error(`${email}: ${error.message}`);
    userId = data.user.id;
    console.log(`Created Auth user ${email}`);
  } else {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password: STAFF_PASSWORD,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        auth_provider: 'password',
      },
    });
    if (error) throw new Error(`${email} update: ${error.message}`);
    console.log(`Updated Auth user ${email}`);
  }

  const { error: profileError } = await admin.from('profiles').upsert(
    {
      id: userId,
      email,
      first_name: firstName,
      last_name: lastName,
      role,
      is_verified: true,
      is_active: true,
      profile_complete: true,
      auth_provider: 'password',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );
  if (profileError) throw new Error(`${email} profile: ${profileError.message}`);
  console.log(`  → profiles.role = ${role}`);
}

async function main() {
  console.log(`Target: ${url}`);
  for (const row of STAFF) {
    await ensureStaffUser(row);
  }
  console.log('Done. Staff can sign in with demo password Admin@2026 and sync live orders.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});