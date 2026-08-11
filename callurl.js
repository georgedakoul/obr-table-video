// Builds the meeting URL for a given provider, room and display name.
// Kept separate from index.html so test.mjs can assert on it.

export const PROVIDERS = {
  // Jitsi resolves a room purely from its name, so every client in the Owlbear
  // room lands in the same call with nothing to share. Element Call does not:
  // visiting /<name> starts a *new* call, so each person would create their
  // own. Anything that cannot join by name has to go through a shared link.
  jitsi: {
    label: "Jitsi (joins automatically)",
    host: "meet.jit.si",
    editableHost: true,
    joinsByName: true,
  },
};

// A link the GM pastes is loaded into an iframe, so it is a trust boundary:
// only ever accept absolute https URLs. Rejects javascript:, data:, etc.
export function sanitizeLink(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  let u;
  try { u = new URL(s); } catch { return null; }
  return u.protocol === "https:" ? u.toString() : null;
}

export function callUrl(provider, host, room, displayName) {
  const h = String(host).trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  if (!h || !PROVIDERS[provider]) return null;
  const r = encodeURIComponent(room);

  // Jitsi: everything rides in the hash as config overrides.
  const opts = [
    "userInfo.displayName=" + encodeURIComponent(JSON.stringify(displayName)),
    "config.prejoinConfig.enabled=false",
    "config.disableDeepLinking=true",
  ];
  return `https://${h}/${r}#${opts.join("&")}`;
}
