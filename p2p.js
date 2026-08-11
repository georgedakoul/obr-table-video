// A peer-to-peer video mesh that signals over Owlbear's broadcast channel, so
// it needs no server of its own. Each participant opens one RTCPeerConnection
// per other participant.
//
// ponytail: full mesh, not an SFU. Every peer uploads its stream once per other
// peer, so upstream cost grows with the table size. Fine to about 6 people; past
// that you need an SFU (Jitsi/LiveKit), which is what the hosted providers are
// for.

export const SIGNAL_CHANNEL = "com.github.georgedakoul.obr-table-video/signal";

// Public STUN only. Without a TURN server, peers behind symmetric NAT or strict
// corporate firewalls will fail to connect; there is no way around that without
// relaying traffic through a server someone pays for.
export const RTC_CONFIG = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ],
};

// Both sides must agree on who sends the offer, or they collide ("glare") and
// both end up in have-local-offer. Comparing ids gives each pair one initiator
// without any extra negotiation.
export function isInitiator(selfId, peerId) {
  return String(selfId) < String(peerId);
}

export class Mesh {
  // send(toId, message) goes out over the Owlbear broadcast channel.
  constructor({ selfId, send, onTrack, onPeerEnd, localStream = null }) {
    this.selfId = selfId;
    this.send = send;
    this.onTrack = onTrack;
    this.onPeerEnd = onPeerEnd;
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
      if (e.candidate) this.send(peerId, { type: "ice", candidate: e.candidate });
    };
    pc.ontrack = (e) => this.onTrack(peerId, e.streams[0]);
    pc.onconnectionstatechange = () => {
      if (["failed", "closed"].includes(pc.connectionState)) this.drop(peerId);
    };

    return entry;
  }

  async connect(peerId) {
    const { pc } = this.peer(peerId);
    if (!isInitiator(this.selfId, peerId)) return; // the other side will offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.send(peerId, { type: "offer", sdp: pc.localDescription });
  }

  async handleSignal(fromId, msg) {
    if (!msg || typeof msg !== "object") return;
    const entry = this.peer(fromId);
    const { pc } = entry;

    if (msg.type === "offer") {
      await pc.setRemoteDescription(msg.sdp);
      await this.flushIce(entry);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.send(fromId, { type: "answer", sdp: pc.localDescription });
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
