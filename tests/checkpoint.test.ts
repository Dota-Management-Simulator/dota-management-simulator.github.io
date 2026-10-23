import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rename, writeFile, utimes, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readCheckpoint, writeCheckpoint } from "../scripts/checkpoint.mjs";

test("a transient sync lock retries atomic checkpoints; a persistent lock retains resumable work", async () => {
  const dir = await mkdtemp(join(tmpdir(), "aegis-checkpoint-"));
  const file = join(dir, "state.json");
  try {
    let attempts = 0;
    await writeCheckpoint(file, { maps: 100 }, {
      pause: async () => {},
      renameFile: async (from: string, to: string) => {
        if (++attempts < 3) throw Object.assign(Error("Sync lock"), { code: "EPERM" });
        return rename(from, to);
      },
    });
    assert.equal(attempts, 3);
    assert.deepEqual(await readCheckpoint(file), { maps: 100 });
    await utimes(file, new Date(0), new Date(0));
    await writeCheckpoint(file, { maps: 200 }, {
      pause: async () => {},
      renameFile: async () => { throw Object.assign(Error("Sync lock"), { code: "EBUSY" }); },
    });
    assert.deepEqual(await readCheckpoint(file), { maps: 200 });
    // A subsequent successful write takes precedence over the recovery file.
    await writeFile(file + '.recovery.json', JSON.stringify({ maps: 200 }));
    await utimes(file + '.recovery.json', new Date(0), new Date(0));
    await writeCheckpoint(file, { maps: 300 });
    assert.deepEqual(await readCheckpoint(file), { maps: 300 });
  } finally { await rm(dir, { recursive: true, force: true }); }
});
