// A peer-to-peer video mesh that signals over Owlbear's broadcast channel, so
// it needs no server of its own. Each participant opens one RTCPeerConnection
// per other participant.
//
// ponytail: full mesh, not an SFU. Every peer uploads its stream once per other
// peer, so upstream cost grows with the table size. Fine to about 6 people; past
// that you need an SFU (Jitsi/LiveKit), which is what the hosted providers are
// for.

export const SIGNAL_CHANNEL = "com.github.georgedakoul.obr-table-video/signal";

// STUN alone fails whenever both ends are behind symmetric NAT, which is the
// normal case for a phone on mobile data talking to a machine behind a home
// router. A TURN relay is the only fix, so this falls back to the free public
// Open Relay one. Media stays DTLS-SRTP encrypted end to end, so the relay
// forwards bytes it cannot read, but it is a shared free service: swap in your
// own TURN credentials if you want it to be dependable.
//
// The 443/TCP entry matters most, it is what gets through networks that block
// UDP entirely.
export const RTC_CONFIG = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
    {
      urls: [
        "turn:staticauth.openrelay.metered.ca:80",
        "turn:staticauth.openrelay.metered.ca:80?transport=tcp",
        "turns:staticauth.openrelay.metered.ca:443?transport=tcp",
      ],
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
};

// RTCSessionDescription and RTCIceCandidate are platform objects, not plain
// data. The Owlbear SDK ships a broadcast over postMessage, which uses the
// structured clone algorithm, and that rejects them outright with "The object
// can not be cloned" -- so every offer and candidate silently failed to send.
// Everything that crosses the wire has to be reduced to plain values first.
export function plainSdp(desc) {
  return { type: desc.type, sdp: desc.sdp };
}

export function plainCandidate(candidate) {
  if (typeof candidate.toJSON === "function") return candidate.toJSON();
  return {
    candidate: candidate.candidate,
    sdpMid: candidate.sdpMid,
    sdpMLineIndex: candidate.sdpMLineIndex,
    usernameFragment: candidate.usernameFragment,
  };
}

// Both sides must agree on who sends the offer, or they collide ("glare") and
// both end up in have-local-offer. Comparing ids gives each pair one initiator
// without any extra negotiation.
export function isInitiator(selfId, peerId) {
  return String(selfId) < String(peerId);
}

export class Mesh {
  // send(toId, message) goes out over the Owlbear broadcast channel.
  // onState(peerId, state) reports connection progress for the UI.
  constructor({ selfId, send, onTrack, onPeerEnd, onState = () => {}, onError = () => {}, localStream = null }) {
    this.selfId = selfId;
    this.send = send;
    this.onTrack = onTrack;
    this.onPeerEnd = onPeerEnd;
    this.onState = onState;
    this.onError = onError;
    this.localStream = localStream;
    this.peers = new Map(); // peerId -> { pc, pendingIce[] }
  }

  /** Reconcile open connections against the set of peers currently in the call. */
  syncPeers(peerIds) {
    const wanted = new Set(peerIds);
    wanted.delete(this.selfId);

    for (const id of wanted) {
      if (!this.peers.has(id)) this.connect(id);
    }
    for (const id of [...this.peers.keys()]) {
      if (!wanted.has(id)) this.drop(id);
    }
  }

  peer(peerId) {
    let entry = this.peers.get(peerId);
    if (entry) return entry;

    const pc = new RTCPeerConnection(RTC_CONFIG);
    entry = { pc, pendingIce: [] };
    this.peers.set(peerId, entry);

    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        pc.addTrack(track, this.localStream);
      }
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) this.signal(peerId, { type: "ice", candidate: plainCandidate(e.candidate) });
    };
    pc.ontrack = (e) => this.onTrack(peerId, e.streams[0]);
    pc.oniceconnectionstatechange = () => this.onState(peerId, pc.iceConnectionState);
    pc.onconnectionstatechange = () => {
      this.onState(peerId, pc.connectionState);
      // "disconnected" often recovers on its own, so only tear down on a
      // terminal state.
      if (["failed", "closed"].includes(pc.connectionState)) this.drop(peerId);
    };

    return entry;
  }

  signal(peerId, msg) {
    // send() is async; a rejected broadcast must not vanish.
    try {
      const r = this.send(peerId, msg);
      if (r && r.catch) r.catch((e) => this.onError(peerId, "send: " + (e && e.message || e)));
    } catch (err) {
      this.onError(peerId, "send: " + (err && err.message || err));
    }
  }

  async connect(peerId) {
    // Called without await from syncPeers, so anything thrown here would become
    // a silent unhandled rejection.
    try {
      const { pc } = this.peer(peerId);
      if (!isInitiator(this.selfId, peerId)) return; // the other side will offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.signal(peerId, { type: "offer", sdp: plainSdp(pc.localDescription) });
    } catch (err) {
      this.onError(peerId, "offer: " + (err && err.message || err));
    }
  }

  async handleSignal(fromId, msg) {
    if (!msg || typeof msg !== "object") return;
    try {
      await this.route(fromId, msg);
    } catch (err) {
      this.onError(fromId, msg.type + ": " + (err && err.message || err));
    }
  }

  async route(fromId, msg) {
    const entry = this.peer(fromId);
    const { pc } = entry;

    if (msg.type === "offer") {
      await pc.setRemoteDescription(msg.sdp);
      await this.flushIce(entry);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.signal(fromId, { type: "answer", sdp: plainSdp(pc.localDescription) });
    } else if (msg.type === "answer") {
      await pc.setRemoteDescription(msg.sdp);
      await this.flushIce(entry);
    } else if (msg.type === "ice" && msg.candidate) {
      // Candidates can arrive before the remote description is set; adding one
      // then throws, so hold them until there is something to attach them to.
      if (pc.remoteDescription && pc.remoteDescription.type) {
        await pc.addIceCandidate(msg.candidate).catch(() => {});
      } else {
        entry.pendingIce.push(msg.candidate);
      }
    }
  }

  async flushIce(entry) {
    for (const c of entry.pendingIce.splice(0)) {
      await entry.pc.addIceCandidate(c).catch(() => {});
    }
  }

  drop(peerId) {
    const entry = this.peers.get(peerId);
    if (!entry) return;
    this.peers.delete(peerId);
    try { entry.pc.close(); } catch {}
    this.onPeerEnd(peerId);
  }

  close() {
    for (const id of [...this.peers.keys()]) this.drop(id);
    if (this.localStream) {
      for (const t of this.localStream.getTracks()) t.stop();
      this.localStream = null;
    }
  }
}
