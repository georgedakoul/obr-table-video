import assert from "node:assert/strict";
import { callUrl, sanitizeLink, PROVIDERS } from "./callurl.js";
import { isInitiator, Mesh, RTC_CONFIG } from "./p2p.js";

// --- Jitsi url building --------------------------------------------------
assert.equal(
  callUrl("jitsi", "meet.jit.si", "obr-table-abc", "Gandalf"),
  'https://meet.jit.si/obr-table-abc#userInfo.displayName=%22Gandalf%22&config.prejoinConfig.enabled=false&config.disableDeepLinking=true'
);

assert.equal(
  callUrl("jitsi", "https://meet.example.org//", "r1", "A").split("#")[0],
  "https://meet.example.org/r1"
);

const url = callUrl("jitsi", "meet.jit.si", "r1", 'Bob "The Rock" & Co');
assert.ok(!url.includes(" "), "no raw spaces in url");
const dn = new URL(url).hash.match(/userInfo\.displayName=([^&]*)/)[1];
assert.equal(JSON.parse(decodeURIComponent(dn)), 'Bob "The Rock" & Co');

assert.ok(callUrl("jitsi", "meet.jit.si", "a/b", "x").startsWith("https://meet.jit.si/a%2Fb#"));

// Two clients in the same Owlbear room must derive the identical url.
assert.equal(
  callUrl("jitsi", "meet.jit.si", "obr-table-XYZ", "GM"),
  callUrl("jitsi", "meet.jit.si", "obr-table-XYZ", "GM"),
);

assert.equal(callUrl("jitsi", "   ", "r1", "x"), null, "empty host refused");
assert.equal(callUrl("nope", "meet.jit.si", "r1", "x"), null, "unknown provider refused");

for (const [key, p] of Object.entries(PROVIDERS)) {
  const u = callUrl(key, p.host, "room1", "Someone");
  assert.ok(u && new URL(u).protocol === "https:", `${key} builds an https url`);
}

// --- sanitizeLink: a GM-pasted link is loaded into an iframe -------------
assert.equal(sanitizeLink("https://call.element.io/abc"), "https://call.element.io/abc");
assert.equal(sanitizeLink("  https://meet.example.org/x  "), "https://meet.example.org/x");

for (const bad of [
  "javascript:alert(1)", "JavaScript:alert(1)",
  "data:text/html,<script>alert(1)</script>",
  "http://insecure.example.org/x", "vbscript:msgbox", "file:///etc/passwd",
  "//call.element.io/abc", "call.element.io/abc", "", "   ", null, undefined,
]) {
  assert.equal(sanitizeLink(bad), null, `refuses ${JSON.stringify(bad)}`);
}

// --- isInitiator: exactly one side of every pair offers ------------------
// Glare (both sides offering) is the classic way a mesh deadlocks, so this must
// be antisymmetric for every ordering.
const ids = ["a", "b", "zz", "A", "0", "conn-123", "conn-124"];
for (const x of ids) {
  assert.equal(isInitiator(x, x), false, "never initiates to itself");
  for (const y of ids) {
    if (x === y) continue;
    assert.notEqual(isInitiator(x, y), isInitiator(y, x),
      `exactly one initiator for ${x}/${y}`);
  }
}

// --- Mesh peer bookkeeping ----------------------------------------------
// Stub just enough of the WebRTC surface to drive syncPeers/drop.
const closed = [];
globalThis.RTCPeerConnection = class {
  constructor() { this.connectionState = "new"; this.remoteDescription = null; }
  addTrack() {}
  close() { closed.push(this); }
  async createOffer() { return { type: "offer", sdp: "x" }; }
  async setLocalDescription(d) { this.localDescription = d; }
};

assert.ok(RTC_CONFIG.iceServers.some((s) => s.urls.some((u) => u.startsWith("stun:"))), "has STUN");
// Without a TURN relay a phone on mobile data cannot reach a machine behind a
// home router, so the relay entries must survive any future edit of the config.
const turn = RTC_CONFIG.iceServers.find((s) => s.urls.some((u) => u.startsWith("turn")));
assert.ok(turn, "has TURN");
assert.ok(turn.username && turn.credential, "TURN carries credentials");
assert.ok(turn.urls.some((u) => u.includes("443") && u.includes("transport=tcp")),
  "has a 443/TCP TURN url for UDP-blocked networks");

const sent = [];
const ended = [];
const mesh = new Mesh({
  selfId: "m",
  send: (to, msg) => sent.push([to, msg]),
  onTrack: () => {},
  onPeerEnd: (id) => ended.push(id),
});

mesh.syncPeers(["m", "a", "z"]);
assert.deepEqual([...mesh.peers.keys()].sort(), ["a", "z"], "self excluded, peers created");

// "m" > "a" so the other side offers; "m" < "z" so we offer to z.
await new Promise((r) => setTimeout(r, 0));
assert.deepEqual(sent.map(([to, m]) => [to, m.type]), [["z", "offer"]],
  "offers only to peers we initiate to");

// A peer leaving is closed exactly once and reported once.
mesh.syncPeers(["m", "a"]);
assert.deepEqual([...mesh.peers.keys()], ["a"], "departed peer removed");
assert.deepEqual(ended, ["z"]);

mesh.drop("z"); // already gone
assert.deepEqual(ended, ["z"], "dropping an absent peer is a no-op");

// Re-syncing the same set must not churn connections.
const before = mesh.peers.get("a");
mesh.syncPeers(["m", "a"]);
assert.equal(mesh.peers.get("a"), before, "existing peer connection reused");

const openCount = closed.length;
mesh.close();
assert.equal(mesh.peers.size, 0, "close tears down every peer");
assert.equal(closed.length, openCount + 1, "close() called on the remaining connection");

console.log("all ok");
