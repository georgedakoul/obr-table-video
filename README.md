# Table Video — Owlbear Rodeo extension

Webcam video chat inside your Owlbear Rodeo room. Everyone in the same Owlbear
room automatically lands in the same call — no room codes to pass around.

## Why not Discord

Discord cannot be embedded. `discord.com` serves `X-Frame-Options: DENY`, so no
iframe will ever load it, and Discord's API exposes no voice or video streams to
third parties. The reverse trick (running Owlbear inside a Discord Activity) is
blocked too — `owlbear.rodeo` serves `X-Frame-Options: SAMEORIGIN`.

So this extension brings its own video instead: a built-in peer-to-peer mode by
default, with hosted Jitsi or any pasted call link as fallbacks. Keep Discord
open for text if you like; the faces live in Owlbear.

## Install

This is already deployed. GM only:

1. Owlbear Rodeo profile → **Add Extension** → paste:

   ```
   https://obr-table-video.pages.dev/manifest.json
   ```

2. Open your room's extension menu and enable **Table Video** for the room.

3. Players just open the GM's room link. Extensions are enabled per room, so
   players install nothing.

4. Click the camera icon in the Owlbear toolbar, then **Join video**.

### Hosting your own copy

Owlbear loads extensions from a URL — there is no upload box — so the static
files have to sit on some public HTTPS host. It parks the files; nothing runs
during your game.

This copy lives on Cloudflare Pages:

```
npx wrangler pages deploy . --project-name obr-table-video
```

The `icon` and `popover` fields in `manifest.json` are **full absolute URLs**, so
a fork has to edit those three lines to point at its own host.

`_headers` sets `Cache-Control: no-cache` on everything. The files are small and
revalidate to a 304, and a stale client is very hard to diagnose from the other
end of a video call.

## Built-in peer-to-peer mode (default)

The **Built in, peer to peer** mode needs no video service at all. Each browser
connects directly to each other browser with WebRTC, and the connection
handshake travels over Owlbear's own broadcast channel, so there is no server
to run, no account, no time limit, and no branding. The UI is plain HTML in
`index.html`, so it is yours to restyle.

Two real limits, both inherent to serverless P2P:

- **Group size.** It is a full mesh: every participant sends their video once
  per other participant. Comfortable to about 6 people. Past that you want an
  SFU, which is what the hosted providers are for.
- **Strict networks.** STUN alone cannot connect two peers that are both behind
  symmetric NAT, which is the normal case for a phone on mobile data calling a
  desktop behind a home router. A TURN relay is the only fix, so this falls back
  to the free public Open Relay servers, including a 443/TCP entry for networks
  that block UDP. Media stays DTLS-SRTP encrypted, so the relay forwards bytes it
  cannot read. Open Relay is a shared free service though: swap in your own TURN
  credentials in `p2p.js` if you need it to be dependable.

Presence works through Owlbear player metadata: joining sets an in-call flag,
everyone else sees it via `party.onChange` and dials you. Leaving, or the panel
being torn down, clears it and releases the camera.

## Hosted modes: how everyone ends up in the same call

Two mechanisms, in priority order.

**1. Shared call link (GM only).** The GM pastes any `https://` call link into
the *Shared call link* box and clicks **Set for room**. It is stored in Owlbear
room metadata, so every client in the room picks it up immediately and joins
that exact call. Works with anything: Element Call, Zoom, Meet, Discord's own
invite (in a browser tab), a self-hosted Jitsi. **Clear** removes it.

**2. Automatic, by room name.** With no shared link set, the call room is
derived from the Owlbear room id, so everyone computes the identical URL with
nothing to pass around.

Automatic mode only works with a service that resolves a room *from its name*.
Jitsi does. **Element Call does not** — visiting `call.element.io/<name>` starts
a brand new call rather than joining an existing one, so the GM and each player
would each create their own separate call. That is why Element Call is not in
the dropdown: use it through the shared call link instead.

### Using Element Call

1. GM opens <https://call.element.io> in a normal tab and starts a call.
2. Copy the URL from the address bar.
3. Paste it into **Shared call link** → **Set for room**.

### The Jitsi time limit

`meet.jit.si` **deliberately disconnects embedded calls after 5 minutes**. It
prints "embedding meet.jit.si is intended only for demonstration purposes" and
drops the call. That is 8x8's policy for their free demo server, not something
this extension can change. Options:

| Option | Cost | Needs a backend |
|---|---|---|
| Use the **Pop out** button with `meet.jit.si` | free | no |
| **JaaS** free tier (25 monthly active users, unlimited minutes) | free | yes — a JWT signer |
| Self-host Jitsi on a VPS | ~5/mo | no, but you run the server |

The pop-out trick works because the 5-minute cut applies only to *embedded*
mode. A call in its own browser window is not embedded, so it runs untouched.

Community-run Jitsi instances mostly refuse embedding now — `meet.ffmuc.net`,
for example, restricts `frame-ancestors` to an allowlist. Pointing this
extension at someone's donated server is also poor manners.

## Local development

Owlbear accepts a `http://localhost` manifest URL for development:

```
python3 -m http.server 5173
```

then add `http://localhost:5173/manifest.json` as a custom extension.

Run the tests with:

```
node test.mjs
```

### Rebuilding the vendored SDK

`obr-sdk.js` is the Owlbear Rodeo SDK bundled into a single file and committed,
so the page makes no cross-origin requests at startup. To update it:

```
npm install @owlbear-rodeo/sdk@latest
echo 'export { default } from "@owlbear-rodeo/sdk";' > entry.js
npx esbuild entry.js --bundle --format=esm --minify --outfile=obr-sdk.js
```

## Notes

- Anyone who has your Owlbear room link can also join the video call. That is
  the same trust model Owlbear itself uses for rooms.
- The Owlbear action popover is a fixed-size panel. **Open in separate window**
  gives you a resizable call window if the panel is too cramped.
- `meet.jit.si` is a free public service run by 8x8. Fine for a gaming group;
  point the server field at your own Jitsi instance for anything heavier.

## License and attribution

MIT, see [LICENSE](LICENSE).

This is an unofficial, community-made extension. It is not affiliated with,
endorsed by, or sponsored by Owlbear Rodeo, Jitsi, or 8x8. "Owlbear Rodeo" and
"Jitsi" are the trademarks of their respective owners and are used here only to
describe what this extension interoperates with.

`obr-sdk.js` is a bundled copy of the Owlbear Rodeo SDK (MIT). Everything else
is original. Video is carried peer to peer, or by whichever service you point
the hosted modes at.
