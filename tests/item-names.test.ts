import { test } from "node:test";
import assert from "node:assert/strict";
import { itemCatalog, itemsAvailableForPatch } from "../src/items";
import { patchForSeason } from "../src/patches";

test("upgrade levels get their own names so every shop list is unambiguous", () => {
  assert.equal(itemCatalog.find(i=>i.id==="dagon_3")?.name,"Dagon 3");
  assert.equal(itemCatalog.find(i=>i.id==="necronomicon_2")?.name,"Necronomicon 2");
  assert.equal(itemCatalog.find(i=>i.id==="diffusal_blade_2")?.name,"Diffusal Blade 2");
  for(const year of [2011,2016,2021,2026]){
    const names=itemsAvailableForPatch(patchForSeason(year,1)).map(i=>i.name);
    assert.deepEqual(names.filter((n,i)=>names.indexOf(n)!==i),[],`${year} duplicates`);
  }
});
