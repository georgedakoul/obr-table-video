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

## Video server

The **Video server** field defaults to `meet.jit.si`. If that instance asks you
to sign in as a moderator, swap in a public open instance such as
`meet.ffmuc.net`, or your own self-hosted Jitsi. The choice is remembered per
browser.

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
