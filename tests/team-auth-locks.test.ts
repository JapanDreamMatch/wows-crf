import { describe, expect, it } from "vitest";
import { withTeamLock, withTeamLocks } from "@/util/TeamAuth";

describe("TeamAuth In-Memory Concurrency Locks", () => {
    it("allows sequential execution and blocks concurrent execution on the same team", async () => {
        let releaseFirst!: () => void;
        const firstGate = new Promise<void>((resolve) => {
            releaseFirst = resolve;
        });

        const firstPromise = withTeamLock("JDM1", async () => {
            await firstGate;
            return "first-ok";
        });

        // While JDM1 is locked, a parallel request for JDM1 must immediately return { locked: true }
        const concurrentSameTeam = await withTeamLock("JDM1", async () => "should-not-run");
        expect(concurrentSameTeam).toEqual({ locked: true });

        // A parallel request for a different team (JDM2) must succeed independently
        const concurrentOtherTeam = await withTeamLock("JDM2", async () => "other-team-ok");
        expect(concurrentOtherTeam).toEqual({ locked: false, result: "other-team-ok" });

        releaseFirst();
        const firstResult = await firstPromise;
        expect(firstResult).toEqual({ locked: false, result: "first-ok" });

        // After JDM1 completes, the lock must be released
        const subsequentSameTeam = await withTeamLock("JDM1", async () => "subsequent-ok");
        expect(subsequentSameTeam).toEqual({ locked: false, result: "subsequent-ok" });
    });

    it("always releases locks in finally block even if the task throws an error", async () => {
        await expect(
            withTeamLock("ERR1", async () => {
                throw new Error("simulated spreadsheet failure");
            }),
        ).rejects.toThrow("simulated spreadsheet failure");

        const retryAfterError = await withTeamLock("ERR1", async () => "recovered");
        expect(retryAfterError).toEqual({ locked: false, result: "recovered" });
    });

    it("withTeamLocks locks both old and new nicknames on rename and blocks partial overlap", async () => {
        let releaseRename!: () => void;
        const renameGate = new Promise<void>((resolve) => {
            releaseRename = resolve;
        });

        const renamePromise = withTeamLocks(["OLD_T", "NEW_T"], async () => {
            await renameGate;
            return "renamed";
        });

        // Both OLD_T and NEW_T must be locked
        expect(await withTeamLock("OLD_T", async () => "x")).toEqual({ locked: true });
        expect(await withTeamLock("NEW_T", async () => "x")).toEqual({ locked: true });

        releaseRename();
        expect(await renamePromise).toEqual({ locked: false, result: "renamed" });

        // Both must be unlocked afterwards
        expect(await withTeamLock("OLD_T", async () => "ok")).toEqual({ locked: false, result: "ok" });
        expect(await withTeamLock("NEW_T", async () => "ok")).toEqual({ locked: false, result: "ok" });
    });

    it("normalizes lock keys case-insensitively so 'jdm' and 'JDM' cannot run concurrently", async () => {
        let releaseLock!: () => void;
        const gate = new Promise<void>((resolve) => {
            releaseLock = resolve;
        });

        const active = withTeamLock("JDM", async () => {
            await gate;
            return "done";
        });

        expect(await withTeamLock("jdm", async () => "bypass")).toEqual({ locked: true });
        releaseLock();
        expect(await active).toEqual({ locked: false, result: "done" });
    });
});
