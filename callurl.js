// A link the GM pastes is loaded into an iframe, so it is a trust boundary:
// only ever accept absolute https URLs. Rejects javascript:, data:, etc.
export function sanitizeLink(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  let u;
  try { u = new URL(s); } catch { return null; }
  return u.protocol === "https:" ? u.toString() : null;
}
