# Table Video — Owlbear Rodeo extension

Webcam video chat inside your Owlbear Rodeo room. Everyone in the same Owlbear
room automatically lands in the same call — no room codes to pass around.

## Why not Discord

Discord cannot be embedded. `discord.com` serves `X-Frame-Options: DENY`, so no
iframe will ever load it, and Discord's API exposes no voice or video streams to
third parties. The reverse trick (running Owlbear inside a Discord Activity) is
blocked too — `owlbear.rodeo` serves `X-Frame-Options: SAMEORIGIN`.

This extension uses Jitsi Meet instead, which is embeddable, free, and needs no
backend of your own. Keep Discord open for text if you like; the faces live in
Owlbear.

## Install

This is already deployed. GM only:

1. Owlbear Rodeo profile → **Add Extension** → paste:

   ```
   https://georgedakoul.github.io/obr-table-video/manifest.json
   ```

2. Open your room's extension menu and enable **Table Video** for the room.

3. Players just open the GM's room link. Extensions are enabled per room, so
   players install nothing.

4. Click the camera icon in the Owlbear toolbar, then **Join video**.

### Hosting your own copy

Owlbear loads extensions from a URL — there is no upload box — so the static
files have to sit on some public HTTPS host. It parks the files; nothing runs
during your game.

Any static host works (GitHub Pages, Cloudflare Pages, Netlify). The `icon` and
`popover` fields in `manifest.json` are **full absolute URLs**, so a fork has to
edit those three lines to point at its own host. They are absolute rather than
relative because GitHub Pages serves projects from a subpath, where a leading
`/` resolves to the wrong place.

## How everyone ends up in the same call

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

No third-party code is bundled. The Owlbear Rodeo SDK (MIT) is loaded at runtime
from esm.sh, and the video call is hosted by a Jitsi Meet instance you choose.
