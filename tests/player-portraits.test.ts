import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import identities from "../src/data/player-identities.json";
import references from "../scripts/data/player-portrait-references.json";
import supplements from "../scripts/data/player-portrait-supplements.json";
import catalog from "../src/data/player-portraits.json";
import { playerPortraits, portraitFor } from "../src/player-portraits";

test("portraits have reviewed identities, locally bundled images and complete photo credits", () => {
  const ids = new Set(identities.players.map((p) => p.id));
  const selections = [...references.players, ...supplements.players].map((p) => p.id);
  assert.equal(new Set(selections).size, selections.length);
  assert.deepEqual(Object.keys(playerPortraits).sort(), selections.sort());
  assert.deepEqual(Object.keys(catalog.players).sort(), selections.sort());
  assert.ok(selections.length >= 1000, "Keep the expanded portrait coverage");
  assert.equal(new Set(Object.values(playerPortraits).map((p) => p.path)).size, selections.length);
  assert.equal(readdirSync("public/player-portraits").filter((p) => p.endsWith(".webp")).length, selections.length);
  // These Commons group shots remain excluded; a separately verified headshot
  // from another source may now cover the same player.
  for (const excluded of references.excluded) assert.ok(!references.players.some((p) => p.id === excluded.id));
  const publicCredits = JSON.parse(readFileSync("public/player-portraits/credits.json", "utf8"));
  assert.deepEqual(publicCredits.players, catalog.players);
  for (const [id, photo] of Object.entries(catalog.players)) {
    const runtime = portraitFor(id);
    assert.deepEqual(runtime, {
      path: photo.path, filePage: photo.filePage, author: photo.author,
      license: photo.license, photoDate: photo.photoDate,
      ...(photo.licenseUrl === photo.filePage ? {} : { licenseUrl: photo.licenseUrl }),
    }, id);
    assert.ok(ids.has(id), id);
    assert.match(photo.path, /^player-portraits\/[a-f0-9]{20}\.webp$/);
    const bytes = readFileSync(resolve("public", photo.path));
    assert.equal(bytes.subarray(8, 12).toString(), "WEBP", id);
    assert.ok(bytes.length > 1000, id);
    if ("source" in photo) {
      const ref = supplements.players.find((p) => p.id === id);
      assert.ok(ref, id);
      assert.equal(photo.identitySource, ref.profile, id);
      assert.equal(photo.rosterSource, ref.rosterSource, id);
      assert.equal(photo.rightsStatus, ref.rightsStatus, id);
      assert.equal(photo.rightsStatement, ref.rightsStatement, id);
      assert.equal(photo.imageUrl, ref.imageUrl, id);
      assert.equal(photo.license, ref.license, id);
      assert.equal(photo.licenseUrl, ref.licenseUrl, id);
      assert.match(photo.identitySource, /^https:\/\/liquipedia.net\/dota2\//);
      assert.match(photo.rosterSource, /^https:\/\/liquipedia.net\/dota2\//);
      assert.ok(photo.rightsStatement.trim().length, id);
      assert.ok(["restricted", "unverified", "open-license", "attribution-permission"].includes(photo.rightsStatus));
      if (photo.rightsStatus === "restricted") assert.match(photo.license, /Liquipedia-only|All rights reserved/);
      if (photo.source === "spectral-player-card") {
        assert.match(photo.imageUrl, /^https:\/\/courier.spectral.gg\/images\/dota\/players\/\d+\.png$/);
        assert.equal(photo.rightsStatus, "unverified");
      }
    } else {
      assert.match(photo.filePage, /^https:\/\/commons.wikimedia.org\/wiki\/File:/);
      assert.match(photo.licenseUrl, /^https:\/\/creativecommons.org\//);
    }
    assert.ok(photo.author.trim().length, id);
    assert.ok(photo.photoDate.length, id);
    assert.match(photo.changes, /Cropped/);
  }
});

test("portrait lookup uses exact IDs and keeps similar, unknown and fictional handles isolated", () => {
  assert.ok(portraitFor("real-dendi"));
  assert.ok(portraitFor("real-fly"));
  assert.ok(portraitFor("real-fly."));
  assert.notEqual(portraitFor("real-fly")?.path, portraitFor("real-fly.")?.path);
  const americanFly = supplements.players.find((p) => p.id === "real-fly.");
  assert.equal(americanFly?.country, "United States");
  assert.match(americanFly?.profile ?? "", /\/Fly\./);
  assert.ok(portraitFor("real-no%5Bo%5Dne"));
  assert.ok(portraitFor("real-no(o)ne"));
  assert.notEqual(portraitFor("real-no%5Bo%5Dne")?.path, portraitFor("real-no(o)ne")?.path);
  for (const id of [undefined, "Dendi", "dendi", "real-nobody", "toString", "__proto__", "p1"]) {
    assert.equal(portraitFor(id), undefined, String(id));
  }
});
