// Temporary local stubs. Swap these bodies for real API calls once a backend is chosen.
// Screens only call these functions, so no screen code needs to change later.
const wait = (ms = 400) => new Promise((r) => setTimeout(r, ms));

export async function login({ username, password }) {
  await wait();
  return { ok: true, user: { username } };
}

export async function register(data) {
  await wait();
  return { ok: true };
}

export async function requestPasswordReset({ contactNumber }) {
  await wait();
  // No SMS is sent yet.
  return { ok: true, sent: false };
}
