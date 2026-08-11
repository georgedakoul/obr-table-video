import assert from "node:assert/strict";
import { callUrl } from "./callurl.js";

// Plain case.
assert.equal(
  callUrl("meet.jit.si", "obr-table-abc", "Gandalf"),
  'https://meet.jit.si/obr-table-abc#userInfo.displayName=%22Gandalf%22&config.prejoinConfig.enabled=false&config.disableDeepLinking=true'
);

// Scheme and trailing slashes get stripped, no double slash before the room.
assert.equal(
  callUrl("https://meet.ffmuc.net//", "r1", "A").split("#")[0],
  "https://meet.ffmuc.net/r1"
);

// Names with spaces, quotes and & survive into the hash intact.
const url = callUrl("meet.jit.si", "r1", 'Bob "The Rock" & Co');
assert.ok(!url.includes(" "), "no raw spaces in url");
const dn = new URL(url).hash.match(/userInfo\.displayName=([^&]*)/)[1];
assert.equal(JSON.parse(decodeURIComponent(dn)), 'Bob "The Rock" & Co');

// Room ids are escaped rather than able to inject extra path segments.
assert.ok(callUrl("meet.jit.si", "a/b", "x").startsWith("https://meet.jit.si/a%2Fb#"));

// Empty server is refused instead of producing https:///room.
assert.equal(callUrl("   ", "r1", "x"), null);

console.log("all ok");
