// ADM-13..16: Admin-only staff account management. Needs the service-role key, so it runs
// server-side as an Edge Function. Deploy: npx supabase functions deploy admin-staff
// Secrets: SUPABASE_SERVICE_ROLE_KEY and SUPABASE_ANON_KEY (SUPABASE_URL is provided).

type StaffRole = 'dietitian' | 'kitchen' | 'delivery';
type Body =
  | { action: 'create'; fullName?: string; email?: string; role?: StaffRole; redirectTo?: string }
  | { action: 'update'; id?: string; fullName?: string; email?: string; role?: StaffRole }
  | { action: 'delete'; id?: string };

const ROLE_TO_DB: Record<StaffRole, string> = {
  dietitian: 'dietitian_staff',
  kitchen: 'kitchen_staff',
  delivery: 'delivery_staff',
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { first_name: parts[0], last_name: '' };
  return { first_name: parts.slice(0, -1).join(' '), last_name: parts[parts.length - 1] };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return reply({ message: 'Method not allowed.' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !serviceKey || !anonKey) return reply({ message: 'Server is not configured.' }, 500);

  const callerToken = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!callerToken) return reply({ message: 'You do not have access to this page.' }, 401);

  const service = (path: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);
    headers.set('apikey', serviceKey);
    headers.set('Authorization', `Bearer ${serviceKey}`);
    headers.set('Content-Type', 'application/json');
    return fetch(`${url}${path}`, { ...init, headers });
  };
  const asCaller = (path: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);
    headers.set('apikey', anonKey);
    headers.set('Authorization', `Bearer ${callerToken}`);
    headers.set('Content-Type', 'application/json');
    return fetch(`${url}${path}`, { ...init, headers });
  };
  const audit = (eventType: string, details: Record<string, unknown>) =>
    asCaller('/rest/v1/rpc/append_audit_event', {
      method: 'POST',
      body: JSON.stringify({ p_event_type: eventType, p_details: details }),
    });

  const me = await asCaller('/auth/v1/user');
  if (!me.ok) return reply({ message: 'You do not have access to this page.' }, 401);
  const caller = await me.json() as { id: string };
  const roleRes = await service(`/rest/v1/profiles?select=role,is_active&id=eq.${caller.id}`);
  const [callerProfile] = roleRes.ok ? await roleRes.json() as { role: string; is_active: boolean }[] : [];
  if (!callerProfile || callerProfile.role !== 'owner_admin' || !callerProfile.is_active) {
    return reply({ message: 'You do not have access to this page.' }, 403);
  }

  let body: Body;
  try {
    body = await request.json() as Body;
  } catch {
    return reply({ message: 'Invalid request.' }, 400);
  }

  const emailTaken = async (email: string, exceptId?: string) => {
    const res = await service(`/rest/v1/profiles?select=id&email=ilike.${encodeURIComponent(email)}`);
    const rows = res.ok ? await res.json() as { id: string }[] : [];
    return rows.some((row) => row.id !== exceptId);
  };

  if (body.action === 'create') {
    const fullName = body.fullName?.trim() || '';
    const email = body.email?.trim().toLowerCase() || '';
    const role = body.role;
    if (!fullName || !email || !role) return reply({ message: 'Full name, email, and role are required.' }, 400);
    if (!ROLE_TO_DB[role]) return reply({ message: 'Choose Dietitian, Kitchen Staff or Delivery Staff.' }, 400);
    if (!email.includes('@')) return reply({ message: 'Enter a valid email address.' }, 400);
    if (await emailTaken(email)) return reply({ message: 'Email is already used by another staff account.' }, 409);
    const names = splitName(fullName);
    // ADM-14 #3: the invite email lets the new staff member set a password.
    const invite = await service('/auth/v1/invite', {
      method: 'POST',
      body: JSON.stringify({ email, data: { ...names, auth_provider: 'password' }, redirect_to: body.redirectTo }),
    });
    if (!invite.ok) {
      const detail = await invite.text();
      if (/already|registered|exists/i.test(detail)) return reply({ message: 'Email is already used by another staff account.' }, 409);
      return reply({ message: 'Could not create the staff account. Try again.' }, 502);
    }
    const user = await invite.json() as { id: string };
    const update = await service(`/rest/v1/profiles?id=eq.${user.id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ ...names, role: ROLE_TO_DB[role], is_active: true, profile_complete: true }),
    });
    if (!update.ok) return reply({ message: 'Staff account was created but the role could not be saved.' }, 502);
    await audit('staff.create', { staff_id: user.id, name: fullName, email, role });
    return reply({ id: user.id, name: fullName, email, role });
  }

  if (body.action === 'update') {
    const id = body.id || '';
    const fullName = body.fullName?.trim() || '';
    const email = body.email?.trim().toLowerCase() || '';
    const role = body.role;
    if (!id || !fullName || !email || !role || !ROLE_TO_DB[role]) {
      return reply({ message: 'Full name, email, and role are required.' }, 400);
    }
    const currentRes = await service(`/rest/v1/profiles?select=id,email,first_name,last_name,role&id=eq.${id}`);
    const [current] = currentRes.ok ? await currentRes.json() as Record<string, string>[] : [];
    if (!current || current.role === 'client' || current.role === 'owner_admin') {
      return reply({ message: 'Staff member not found.' }, 404);
    }
    if (await emailTaken(email, id)) return reply({ message: 'Email is already used by another staff account.' }, 409);
    if (email !== String(current.email).toLowerCase()) {
      const authUpdate = await service(`/auth/v1/admin/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ email, email_confirm: true }),
      });
      if (!authUpdate.ok) return reply({ message: 'Could not update the sign-in email. Try again.' }, 502);
    }
    const names = splitName(fullName);
    const update = await service(`/rest/v1/profiles?id=eq.${id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ ...names, email, role: ROLE_TO_DB[role] }),
    });
    if (!update.ok) return reply({ message: 'Could not save staff changes. Try again.' }, 502);
    await audit('staff.update', {
      staff_id: id,
      old_value: { name: `${current.first_name} ${current.last_name}`.trim(), email: current.email, role: current.role },
      new_value: { name: fullName, email, role: ROLE_TO_DB[role] },
    });
    return reply({ id, name: fullName, email, role });
  }

  if (body.action === 'delete') {
    const id = body.id || '';
    if (!id) return reply({ message: 'Staff member not found.' }, 400);
    if (id === caller.id) return reply({ message: "You can't delete your own account." }, 400);
    const currentRes = await service(`/rest/v1/profiles?select=id,email,first_name,last_name,role&id=eq.${id}`);
    const [current] = currentRes.ok ? await currentRes.json() as Record<string, string>[] : [];
    if (!current || current.role === 'client' || current.role === 'owner_admin') {
      return reply({ message: 'Staff member not found.' }, 404);
    }
    // ADM-16 #1: sign-in is disabled immediately (ban) and every staff RPC checks is_active.
    const ban = await service(`/auth/v1/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ ban_duration: '876000h' }),
    });
    if (!ban.ok) return reply({ message: 'Could not delete the staff member. Try again.' }, 502);
    await service(`/rest/v1/profiles?id=eq.${id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ is_active: false }),
    });
    await service(`/rest/v1/orders?assigned_delivery_id=eq.${id}&status=not.in.(completed,cancelled)`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ assigned_delivery_id: null, assigned_at: null }),
    });
    await audit('staff.delete', {
      staff_id: id,
      name: `${current.first_name} ${current.last_name}`.trim(),
      email: current.email,
      role: current.role,
    });
    return reply({ id, deleted: true });
  }

  return reply({ message: 'Unknown action.' }, 400);
});
