---
title: Table Video
description: Peer-to-peer webcam video chat for your table. No server, no account.
author: George Damian Koulouris
image: https://raw.githubusercontent.com/georgedakoul/obr-table-video/main/docs/hero.png
icon: https://raw.githubusercontent.com/georgedakoul/obr-table-video/main/docs/store-icon.png
tags:
  - other
manifest: https://obr-table-video.pages.dev/manifest.json
learn-more: https://github.com/georgedakoul/obr-table-video
---

See your players while you play, without leaving Owlbear Rodeo and without
signing up for anything.

Everyone in the room lands in the same call automatically. There are no room
codes to paste, no meeting links to share, and no five minute trial cutoff.

## How it works

Video and audio travel **directly between the players' browsers** using WebRTC.
The connection handshake rides on Owlbear's own broadcast channel, so this
extension runs no server of its own. Your camera never passes through any
machine belonging to this project.

Each tile shows how that player is connected, `· direct` or `· relay`, so you
can always see what the call is actually doing.

![The video panel beside an Owlbear map](https://raw.githubusercontent.com/georgedakoul/obr-table-video/main/docs/screenshot-desktop.jpg)

## Using it

- The GM enables the extension for the room. Players install nothing, they just
  open the room link.
- Click the camera icon in the toolbar, then **Join video**.
- Controls fade in when you point at the video, or tap it on a phone. Mic and
  camera state are remembered for next time.
- Unlock the panel with 🔓 and drag the corner to resize it. Lock it again with
  🔒 and the size sticks.

### Taking a player aside

The GM can point at any player's tile and press the button in the middle to stop
that player hearing the call. They get a banner telling them so, rather than
being left wondering why the table went quiet. Press it again to let them back
in, or use **⇄** to swap the whole set at once when you are running two groups.

This is enforced by the other players' browsers rather than trusting the muted
client, and it resets whenever the GM starts a call.

On a phone the panel sits under the map and the controls appear when you tap
the video.

![The call running on a phone](https://raw.githubusercontent.com/georgedakoul/obr-table-video/main/docs/screenshot-mobile.jpg)

## Good to know

- **Group size.** It is a full mesh, so everyone sends their video to everyone
  else. Comfortable up to about six people.
- **Strict networks.** Two players both behind symmetric NAT cannot connect
  directly and fall back to a free public TURN relay, which is shared and
  capped. On a restrictive network a call may fail to connect.
- **Privacy.** No accounts, no analytics, no tracking, no cookies. Media is
  encrypted end to end. Because it is peer to peer, participants' IP addresses
  are visible to each other, as with any peer-to-peer video tool. Anyone with
  your Owlbear room link can join the call.
- **Permissions.** Camera and microphone for the call, and autoplay so tiles
  play without a click each. Nothing else.

Full details, including what is stored and which third parties are contacted,
are in the [disclosure section of the README](https://github.com/georgedakoul/obr-table-video#disclosure).

## Support

Please report bugs or ask questions on
[GitHub Issues](https://github.com/georgedakoul/obr-table-video/issues).

The extension is free and always will be. If you would like to help cover the
relay server that lets players on restrictive networks connect, you can
[sponsor it on GitHub](https://github.com/sponsors/georgedakoul).

Unofficial and community made. Not affiliated with, endorsed by or sponsored by
Owlbear Rodeo. MIT licensed.
