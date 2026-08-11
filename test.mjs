import assert from "node:assert/strict";
import { sanitizeLink } from "./callurl.js";
import { isInitiator, Mesh, RTC_CONFIG, plainSdp, plainCandidate } from "./p2p.js";

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

// --- Everything on the wire must survive structured clone ----------------
// The Owlbear SDK broadcasts over postMessage. RTCSessionDescription and
// RTCIceCandidate are platform objects that structured clone rejects with
// "The object can not be cloned", which silently killed every offer and
// candidate. A method as an own property reproduces that failure in Node.
const nonCloneable = (extra) => ({ ...extra, toJSON() { return { ...extra }; } });

assert.throws(() => structuredClone(nonCloneable({ type: "offer", sdp: "v=0" })),
  "the raw shape really is non-cloneable, so this test means something");

const sdpOut = plainSdp(nonCloneable({ type: "offer", sdp: "v=0" }));
assert.deepEqual(sdpOut, { type: "offer", sdp: "v=0" });
structuredClone(sdpOut); // must not throw

// toJSON is used when present, which is what real RTCIceCandidate provides.
assert.deepEqual(
  plainCandidate({ candidate: "a", sdpMid: "0", toJSON() { return { candidate: "a", sdpMid: "0" }; } }),
  { candidate: "a", sdpMid: "0" });

// and a plain fallback when it is not
const candOut = plainCandidate({ candidate: "b", sdpMid: "1", sdpMLineIndex: 2, usernameFragment: "u" });
assert.deepEqual(candOut, { candidate: "b", sdpMid: "1", sdpMLineIndex: 2, usernameFragment: "u" });
structuredClone(candOut);

// --- Mesh peer bookkeeping ----------------------------------------------
// Stub just enough of the WebRTC surface to drive syncPeers/drop. The
// descriptions are deliberately non-cloneable, matching the browser.
const closed = [];
globalThis.RTCPeerConnection = class {
  constructor() { this.connectionState = "new"; this.remoteDescription = null; }
  addTrack() {}
  close() { closed.push(this); }
  async createOffer() { return nonCloneable({ type: "offer", sdp: "v=0" }); }
  async setLocalDescription(d) { this.localDescription = nonCloneable({ type: d.type, sdp: d.sdp }); }
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

// The regression that mattered: every outbound payload must be cloneable.
for (const [, m] of sent) {
  structuredClone(m);
}

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
// --- silencing: only the named peer loses our audio ----------------------
const audioTrack = { kind: "audio", enabled: true };
const replaced = [];
globalThis.RTCPeerConnection = class {
  constructor() { this.connectionState = "new"; this.remoteDescription = null; this.senders = []; }
  addTrack(track) {
    const sender = { track, replaceTrack(t) { this.track = t; replaced.push([this, t]); return Promise.resolve(); } };
    this.senders.push(sender);
    return sender;
  }
  close() { closed.push(this); }
  async createOffer() { return nonCloneable({ type: "offer", sdp: "v=0" }); }
  async setLocalDescription(d) { this.localDescription = nonCloneable({ type: d.type, sdp: d.sdp }); }
};

const m2 = new Mesh({
  selfId: "m",
  send: () => {},
  onTrack: () => {},
  onPeerEnd: () => {},
  localStream: { getTracks: () => [audioTrack], getAudioTracks: () => [audioTrack] },
});
m2.syncPeers(["m", "a", "b"]);
const senderOf = (id) => m2.peers.get(id).audioSender;
assert.equal(senderOf("a").track, audioTrack, "audio flows to a by default");

m2.setSilenced(["a"]);
assert.equal(senderOf("a").track, null, "silenced peer stops receiving our audio");
assert.equal(senderOf("b").track, audioTrack, "everyone else is unaffected");

// A peer joining while a cutoff is active must inherit it.
m2.syncPeers(["m", "a", "b", "c"]);
assert.equal(senderOf("c").track, audioTrack, "new peer not silenced");
m2.setSilenced(["a", "c"]);
assert.equal(senderOf("c").track, null, "newly silenced peer cut off");
m2.syncPeers(["m", "a", "b", "c", "d"]);
assert.equal(m2.peers.get("d").audioSender.track, audioTrack, "unsilenced newcomer unaffected");

// A peer silenced before they even join must be cut off the moment they do.
// This is what the applySilence call inside peer() is for.
m2.setSilenced(["a", "c", "e"]);
m2.syncPeers(["m", "a", "b", "c", "d", "e"]);
assert.equal(m2.peers.get("e").audioSender.track, null,
  "peer silenced before joining is cut off on arrival");

// Lifting it restores the track.
const before2 = replaced.length;
m2.setSilenced([]);
assert.equal(senderOf("a").track, audioTrack, "audio restored when the cutoff lifts");
assert.equal(m2.peers.get("e").audioSender.track, audioTrack, "and for the late joiner");
assert.ok(replaced.length > before2, "restore actually called replaceTrack");

// Re-applying the same state must not churn replaceTrack.
const stable = replaced.length;
m2.setSilenced([]);
assert.equal(replaced.length, stable, "no redundant replaceTrack when nothing changed");

// --- connectionType reads the nominated pair ----------------------------
// A stats report is Map-like: forEach over entries plus get() by id.
const report = (entries) => {
  const m = new Map(Object.entries(entries));
  return { forEach: (f) => m.forEach(f), get: (k) => m.get(k) };
};

const statsMesh = new Mesh({ selfId: "m", send: () => {}, onTrack: () => {}, onPeerEnd: () => {} });
statsMesh.syncPeers(["m", "p"]);
const pc = statsMesh.peers.get("p").pc;

// Two succeeded pairs, only one nominated: the nominated one must win.
// The nominated pair is listed FIRST and a stale succeeded pair after it, so
// simply taking the last match would pick the wrong one.
pc.getStats = async () => report({
  live: { type: "candidate-pair", state: "succeeded", nominated: true,
          localCandidateId: "lHost", remoteCandidateId: "rHost" },
  stale: { type: "candidate-pair", state: "succeeded", nominated: false,
           localCandidateId: "lRelay", remoteCandidateId: "rRelay" },
  failed: { type: "candidate-pair", state: "failed",
            localCandidateId: "lRelay", remoteCandidateId: "rRelay" },
  lHost: { type: "local-candidate", candidateType: "host" },
  rHost: { type: "remote-candidate", candidateType: "host" },
  lRelay: { type: "local-candidate", candidateType: "relay" },
  rRelay: { type: "remote-candidate", candidateType: "relay" },
});
assert.deepEqual(await statsMesh.connectionType("p"),
  { local: "host", remote: "host", relayed: false }, "nominated pair wins");

// A relay at either end counts as relayed.
pc.getStats = async () => report({
  live: { type: "candidate-pair", state: "succeeded", nominated: true,
          localCandidateId: "l", remoteCandidateId: "r" },
  l: { type: "local-candidate", candidateType: "srflx" },
  r: { type: "remote-candidate", candidateType: "relay" },
});
assert.equal((await statsMesh.connectionType("p")).relayed, true, "remote relay counts");

// Nothing succeeded yet, and a throwing getStats, both give null not a crash.
pc.getStats = async () => report({
  p1: { type: "candidate-pair", state: "checking", localCandidateId: "l", remoteCandidateId: "r" },
});
assert.equal(await statsMesh.connectionType("p"), null, "no succeeded pair yet");
pc.getStats = async () => { throw new Error("boom"); };
assert.equal(await statsMesh.connectionType("p"), null, "getStats failure is survivable");
assert.equal(await statsMesh.connectionType("nobody"), null, "unknown peer");

mesh.close();
assert.equal(mesh.peers.size, 0, "close tears down every peer");
assert.equal(closed.length, openCount + 1, "close() called on the remaining connection");

console.log("all ok");
