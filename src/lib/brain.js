export async function checkAi() {
  try {
    const r = await fetch('/api/health');
    if (!r.ok) return false;
    return (await r.json()).ai === true;
  } catch {
    return false;
  }
}

export async function askFrog(messages, lang, signal) {
  const r = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, lang }),
    signal,
  });
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw Object.assign(new Error(body.error || 'chat_failed'), { code: body.error || 'chat_failed' });
  }
  return r.json();
}
