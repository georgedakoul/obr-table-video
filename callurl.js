// Builds the Jitsi meeting URL for a given server, room and display name.
// Kept separate from index.html so test.mjs can assert on it.
export function callUrl(server, room, displayName) {
  const host = String(server).trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  if (!host) return null;
  const opts = [
    "userInfo.displayName=" + encodeURIComponent(JSON.stringify(displayName)),
    "config.prejoinConfig.enabled=false",
    "config.disableDeepLinking=true",
  ];
  return `https://${host}/${encodeURIComponent(room)}#${opts.join("&")}`;
}
