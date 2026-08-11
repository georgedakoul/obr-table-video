// Builds the meeting URL for a given provider, room and display name.
// Kept separate from index.html so test.mjs can assert on it.

export const PROVIDERS = {
  element: {
    label: "Element Call (no time limit)",
    host: "call.element.io",
    editableHost: false,
  },
  jitsi: {
    label: "Jitsi",
    host: "meet.jit.si",
    editableHost: true,
  },
};

export function callUrl(provider, host, room, displayName) {
  const h = String(host).trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  if (!h || !PROVIDERS[provider]) return null;
  const r = encodeURIComponent(room);

  if (provider === "element") {
    // Element Call collects the display name in its own lobby, so nothing to
    // pass. Fewer assumptions about its URL contract, fewer things to break.
    return `https://${h}/${r}`;
  }

  // Jitsi: everything rides in the hash as config overrides.
  const opts = [
    "userInfo.displayName=" + encodeURIComponent(JSON.stringify(displayName)),
    "config.prejoinConfig.enabled=false",
    "config.disableDeepLinking=true",
  ];
  return `https://${h}/${r}#${opts.join("&")}`;
}
