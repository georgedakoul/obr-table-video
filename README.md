# Table Video — Owlbear Rodeo extension

Webcam video chat inside your Owlbear Rodeo room. Everyone in the same Owlbear
room automatically lands in the same call — no room codes to pass around.

## Why not Discord

Discord cannot be embedded. `discord.com` serves `X-Frame-Options: DENY`, so no
iframe will ever load it, and Discord's API exposes no voice or video streams to
third parties. The reverse trick (running Owlbear inside a Discord Activity) is
blocked too — `owlbear.rodeo` serves `X-Frame-Options: SAMEORIGIN`.

So this extension brings its own video instead: peer to peer between the
players' browsers, with a GM-pasted call link as the fallback. Keep Discord open
for text if you like; the faces live in Owlbear.

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
  SFU.
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

### Taking a player aside (GM only)

Hover or tap a player's tile and press the speaker button. That player stops
hearing the other players, but still hears you, so you can run a private scene
without anyone leaving the call. Press it again to let them back in.

It is enforced by the other players' browsers, not by asking the excluded client
to mute itself: each participant holds a separate peer connection per person, so
everyone else calls `replaceTrack(null)` on the audio sender for that one
connection. Audio to everyone else is unaffected and no renegotiation happens.
The GM's client is exempt, which is what keeps the GM audible.

The cut player is told, by a banner, rather than being left wondering why the
table went quiet. It keys on connection id, so it clears if that player
reconnects.

## If someone cannot connect

Peer to peer fails when both ends are behind symmetric NAT, and the free public
TURN relay it falls back to is capped and shared. For those cases the GM can
paste any `https://` call link (Element Call, Meet, Zoom, a self-hosted Jitsi)
into **Shared call link** and press **Set for room**. It is stored in Owlbear
room metadata, so every client picks it up immediately and joins that exact
call instead of the built-in one. **Clear** returns everyone to peer to peer.

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

## License and attribution

MIT, see [LICENSE](LICENSE).

This is an unofficial, community-made extension. It is not affiliated with,
endorsed by, or sponsored by Owlbear Rodeo. "Owlbear Rodeo" is a trademark of
its owner and is used here only to describe what this extension interoperates
with.

`obr-sdk.js` is a bundled copy of the Owlbear Rodeo SDK (MIT). Everything else
is original. Video is carried peer to peer, or by whichever service you point
the hosted modes at.
