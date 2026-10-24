import { test } from "node:test";
import assert from "node:assert/strict";
import { createCampaign, DEFAULT_SETTINGS } from "../src/game";
import { syncOffice } from "../src/office";
import { formatOfficeDate } from "../src/office-date";
import { formatDate } from "../src/tournaments";

test("client inbox timestamps retain legacy weekly labels and format dated messages without changing saves", () => {
  const campaign = syncOffice({ ...createCampaign(DEFAULT_SETTINGS), week: 4 });
  const before = JSON.stringify(campaign);
  assert.ok(campaign.office!.messages.length > 0);
  for (const message of campaign.office!.messages) {
    assert.equal(formatOfficeDate(message.at), "2011 · Week 4");
  }
  assert.equal(formatOfficeDate("2011-08-17T00:00:00Z"), formatDate("2011-08-17T00:00:00Z"));
  assert.equal(formatOfficeDate("2011-08-17"), formatDate("2011-08-17"));
  assert.equal(formatOfficeDate("2011 · Week 4"), "2011 · Week 4");
  assert.equal(formatOfficeDate("Unknown date"), "Unknown date");
  assert.equal(JSON.stringify(campaign), before);
});
