# Table Video — Owlbear Rodeo extension

Webcam video chat inside your Owlbear Rodeo room. Everyone in the same room
lands in the same call automatically, with no room codes, no accounts and no
video service in the middle.

**Unofficial.** Not affiliated with, endorsed by or sponsored by Owlbear Rodeo.

## Install

Owlbear profile → **Add Extension** → paste:

```
https://obr-table-video.pages.dev/manifest.json
```

Then open your room's extension menu and enable **Table Video** for the room.
Extensions are enabled per room, so players install nothing: they just open the
GM's room link. Click the camera icon in the toolbar, then **Join video**.

## How it works

Each browser connects directly to each other browser with WebRTC. The connection
handshake travels over Owlbear's own broadcast channel and presence over Owlbear
player metadata, so the extension runs no server of its own: the only thing
hosted is five static files.

Two limits, both inherent to serverless peer-to-peer:

- **Group size.** It is a full mesh, so every participant sends their video once
  per other participant. Comfortable to about six people. Past that you want an
  SFU, which this deliberately is not.
- **Strict networks.** Two peers both behind symmetric NAT cannot connect
  directly, which is common for a phone on mobile data calling a desktop behind
  a home router. A TURN relay is the only fix; see
  [Third-party services](#third-party-services).

Each tile's label shows how that peer is actually connected, `· direct` or
`· relay`, so you can see when the relay is being used.

## Controls

The controls fade in when you point at the video, or tap it on a touch screen.

| Control | What it does |
|---|---|
| **Mic** / **Cam** | Toggle your microphone and camera. Red means off. Remembered for next time. |
| **🔒 / 🔓** | Lock or unlock the panel size. Unlocked, drag the corner grip to resize. Size is remembered. |
| **Leave** | Leave the call and release the camera. |
| **⇄** | GM only. Swaps who is cut off, see below. |

### Taking a player aside (GM only)

Point at a player's tile and press the round button in the middle. That player
stops hearing the call entirely, the GM included, and gets a banner telling them
so rather than being left wondering why the table went quiet. Press again to let
them back in. **⇄** inverts the whole set in one click, for bouncing between two
groups.

This is enforced by the other players' browsers rather than by asking the
excluded client to mute itself: each participant holds a separate peer
connection per person, so everyone else calls `replaceTrack(null)` on the audio
sender for that one connection. Audio to everyone else is unaffected and no
renegotiation happens.

Cutoffs do not persist. The GM starting a call clears the list, and entries
pointing at players who have left are pruned automatically.

## If someone cannot connect

The GM can paste any `https://` call link (Element Call, Google Meet, Zoom, a
self-hosted Jitsi) into **Shared call link** and press **Set for room**. It is
stored in Owlbear room metadata, so every client picks it up immediately and
joins that exact call instead of the built-in one. **Clear** returns everyone to
peer to peer. In this mode **Open in separate window** opens the call in its own
browser window.

Only absolute `https://` links are accepted, because that link is loaded into an
iframe.

---

# Disclosure

## What this extension can access, and why

The manifest requests four iframe permissions:

| Permission | Why |
|---|---|
| `camera` | Your webcam, for the call. |
| `microphone` | Your microphone, for the call. |
| `autoplay` | To play the other participants' audio and video without a click on every tile. |
| `display-capture` | **Not used by the built-in call.** It is only there so a call service embedded through **Shared call link** can offer screen sharing. Nothing in this extension captures your screen. |

## Where your audio and video go

In the built-in mode, **your camera and microphone streams go directly to the
other participants' browsers.** They are not recorded, and they do not pass
through any server run by this project, because this project runs no servers.

If the GM sets a **Shared call link**, that third-party service is embedded in
an iframe and its own privacy terms apply to everything inside it.

## Third-party services

| Service | When it is contacted | What it sees |
|---|---|---|
| **Owlbear Rodeo** | Always | Carries the connection handshake and presence flags, as it does for every extension. |
| **Cloudflare Pages** | Panel open | Serves the five static files. Cloudflare logs requests as any web host does. |
| **Google STUN** (`stun.l.google.com`) | Connecting | Your public IP address, to discover how to reach you. No media. |
| **Open Relay TURN** (`staticauth.openrelay.metered.ca`, operated by Metered) | Only when a direct connection fails | Relays the encrypted media stream. It is DTLS-SRTP encrypted end to end, so the relay forwards bytes it cannot read. |

Open Relay is a **free shared public service with a monthly cap**, used by many
projects at once. It is a best-effort fallback, not a guarantee: on a restrictive
network a call may fail to connect. Replace the credentials in `p2p.js` with your
own TURN service if you need it to be dependable.

**IP addresses.** WebRTC is peer to peer, so participants' IP addresses are
visible to each other during connection negotiation. That is true of every
peer-to-peer video tool and cannot be avoided without routing all media through
a relay you pay for.

## What is stored

- **In your browser** (`localStorage`): microphone and camera preference, panel
  size and lock state. Nothing identifying.
- **In Owlbear room metadata**: whether you are currently in the call, the GM's
  shared call link if set, and the list of connection ids currently cut off.
  Cleared when the GM starts a call.

No accounts, no analytics, no tracking, no cookies, no telemetry. Nothing is sent
anywhere except as listed above.

## Who can join

Anyone who has your Owlbear room link can join the video call. That is the same
trust model Owlbear itself uses for rooms. Do not treat a call as private from
someone who already has the room link.

## Warranty

None. See [LICENSE](LICENSE). This is a hobby project provided as-is; do not rely
on it for anything where a failed call matters.

---

# Development

## Hosting your own copy

Owlbear loads extensions from a URL, so the static files need a public HTTPS
host. Nothing runs during your game; the host only parks the files.

```
npx wrangler pages deploy . --project-name obr-table-video
```

The `icon` and `popover` fields in `manifest.json` are full absolute URLs, so a
fork must edit those three lines to point at its own host.

`_headers` sets `Cache-Control: no-cache` on everything. The files are small and
revalidate to a 304, and a stale client is very hard to diagnose from the other
end of a video call.

Bump `BUILD` in `index.html` together with the `?v=` on the three module imports
whenever client code changes. The build number is shown in the panel, so two
clients running different code is visible rather than baffling.

## Local development

Owlbear accepts a `http://localhost` manifest URL:

```
python3 -m http.server 5173
```

then add `http://localhost:5173/manifest.json` as a custom extension.

Tests:

```
node test.mjs
```

## Rebuilding the vendored SDK

`obr-sdk.js` is the Owlbear Rodeo SDK bundled into one file and committed, so the
page makes no cross-origin requests at startup.

```
npm install @owlbear-rodeo/sdk@latest
echo 'export { default } from "@owlbear-rodeo/sdk";' > entry.js
npx esbuild entry.js --bundle --format=esm --minify --outfile=obr-sdk.js
```

## Why not Discord

Discord cannot be embedded: `discord.com` serves `X-Frame-Options: DENY`, and its
API exposes no voice or video streams to third parties. The reverse, running
Owlbear inside a Discord Activity, is blocked the same way, since
`owlbear.rodeo` serves `X-Frame-Options: SAMEORIGIN`.

# License and attribution

MIT, see [LICENSE](LICENSE).

Not affiliated with, endorsed by or sponsored by Owlbear Rodeo, Metered, or
Google. "Owlbear Rodeo" is a trademark of its owner and is used here only to
describe what this extension interoperates with.

`obr-sdk.js` is a bundled copy of the Owlbear Rodeo SDK (MIT). Everything else is
original.
