import assert from "node:assert/strict";
import { callUrl, PROVIDERS } from "./callurl.js";

// --- Jitsi ---------------------------------------------------------------
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

// --- Element Call --------------------------------------------------------
assert.equal(
  callUrl("element", PROVIDERS.element.host, "obr-table-abc", "Gandalf"),
  "https://call.element.io/obr-table-abc"
);
assert.ok(callUrl("element", "call.element.io", "a/b", "x").endsWith("/a%2Fb"));

// --- Rejections ----------------------------------------------------------
assert.equal(callUrl("jitsi", "   ", "r1", "x"), null, "empty host refused");
assert.equal(callUrl("nope", "call.element.io", "r1", "x"), null, "unknown provider refused");

// Every provider in the table produces a usable https URL from its own default.
for (const [key, p] of Object.entries(PROVIDERS)) {
  const u = callUrl(key, p.host, "room1", "Someone");
  assert.ok(u && new URL(u).protocol === "https:", `${key} builds an https url`);
}

console.log("all ok");
