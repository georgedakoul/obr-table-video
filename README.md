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

Owlbear loads extensions from a URL — there is no upload box — so the four
static files (`manifest.json`, `index.html`, `callurl.js`, `icon.svg`) have to
sit on some public HTTPS host. This is a one-time parking spot for the files,
not a server that runs during your game.

1. Put the files on any static host. Cloudflare Pages:

   ```
   npx wrangler pages deploy . --project-name obr-table-video
   ```

   GitHub Pages or a Netlify drag-and-drop deploy work identically.

2. GM only: Owlbear profile → **Add Extension** → paste the manifest URL, e.g.
   `https://obr-table-video.pages.dev/manifest.json`. Then open the room's
   extension menu and enable it for the room.

3. Players just open the GM's room link. Extensions are enabled per room, so
   players install nothing.

4. Click the camera icon in the Owlbear toolbar, then **Join video**.

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
