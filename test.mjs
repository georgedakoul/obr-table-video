import assert from "node:assert/strict";
import { callUrl, sanitizeLink, PROVIDERS } from "./callurl.js";

// --- Jitsi url building --------------------------------------------------
assert.equal(
  callUrl("jitsi", "meet.jit.si", "obr-table-abc", "Gandalf"),
  'https://meet.jit.si/obr-table-abc#userInfo.displayName=%22Gandalf%22&config.prejoinConfig.enabled=false&config.disableDeepLinking=true'
);

// Scheme and trailing slashes get stripped, no double slash before the room.
assert.equal(
  callUrl("jitsi", "https://meet.example.org//", "r1", "A").split("#")[0],
  "https://meet.example.org/r1"
);

// Names with spaces, quotes and & survive into the hash intact.
const url = callUrl("jitsi", "meet.jit.si", "r1", 'Bob "The Rock" & Co');
assert.ok(!url.includes(" "), "no raw spaces in url");
const dn = new URL(url).hash.match(/userInfo\.displayName=([^&]*)/)[1];
assert.equal(JSON.parse(decodeURIComponent(dn)), 'Bob "The Rock" & Co');

// Room ids are escaped rather than able to inject extra path segments.
assert.ok(callUrl("jitsi", "meet.jit.si", "a/b", "x").startsWith("https://meet.jit.si/a%2Fb#"));

// Two clients in the same Owlbear room must derive the identical url.
assert.equal(
  callUrl("jitsi", "meet.jit.si", "obr-table-XYZ", "GM"),
  callUrl("jitsi", "meet.jit.si", "obr-table-XYZ", "GM"),
);

assert.equal(callUrl("jitsi", "   ", "r1", "x"), null, "empty host refused");
assert.equal(callUrl("nope", "meet.jit.si", "r1", "x"), null, "unknown provider refused");

// Every provider that claims to join by name builds a usable https url.
for (const [key, p] of Object.entries(PROVIDERS)) {
  if (!p.joinsByName) continue;
  const u = callUrl(key, p.host, "room1", "Someone");
  assert.ok(u && new URL(u).protocol === "https:", `${key} builds an https url`);
}

// --- sanitizeLink: a GM-pasted link is loaded into an iframe -------------
assert.equal(sanitizeLink("https://call.element.io/abc"), "https://call.element.io/abc");
assert.equal(sanitizeLink("  https://meet.example.org/x  "), "https://meet.example.org/x");

// Anything that is not absolute https is refused.
for (const bad of [
  "javascript:alert(1)",
  "JavaScript:alert(1)",
  "data:text/html,<script>alert(1)</script>",
  "http://insecure.example.org/x",
  "vbscript:msgbox",
  "file:///etc/passwd",
  "//call.element.io/abc",
  "call.element.io/abc",
  "",
  "   ",
  null,
  undefined,
]) {
  assert.equal(sanitizeLink(bad), null, `refuses ${JSON.stringify(bad)}`);
}

console.log("all ok");
