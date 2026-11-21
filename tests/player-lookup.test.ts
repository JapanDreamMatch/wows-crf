import { describe, expect, it } from "vitest";
import { resolveAccountFromList } from "@/util/Player";
import { PLAYER_NOT_FOUND, TOO_MANY_PLAYERS } from "@/util/type/PlayerChecker";

describe("Player Account Lookup (resolveAccountFromList)", () => {
    it("selects the exact matching element data[i] rather than data[0]", () => {
        const accounts = [
            { nickname: "Alpha_01", account_id: 1001 },
            { nickname: "Alpha", account_id: 1002 },
            { nickname: "Alpha_02", account_id: 1003 },
        ];
        expect(resolveAccountFromList("Alpha", accounts, false)).toEqual({
            nickname: "Alpha",
            accountId: 1002,
        });
        expect(resolveAccountFromList("Alpha", accounts, true)).toEqual({
            nickname: "Alpha",
            accountId: 1002,
        });
    });

    it("enforces exact match for single-result registration lookup while allowing typo suggestion in /api/ign", () => {
        const singleCandidate = [{ nickname: "Seaoftrees08", account_id: 2001 }];

        expect(resolveAccountFromList("Seaoftrees0", singleCandidate, false)).toEqual({
            errorMsg: PLAYER_NOT_FOUND,
        });
        expect(resolveAccountFromList("Seaoftrees0", singleCandidate, true)).toEqual({
            nickname: "Seaoftrees08",
            accountId: 2001,
        });
    });

    it("returns PLAYER_NOT_FOUND on empty results and TOO_MANY_PLAYERS when no exact match exists among multiple", () => {
        expect(resolveAccountFromList("Missing", [], false)).toEqual({
            errorMsg: PLAYER_NOT_FOUND,
        });
        expect(
            resolveAccountFromList(
                "Alpha",
                [
                    { nickname: "Alpha_1", account_id: 1 },
                    { nickname: "Alpha_2", account_id: 2 },
                ],
                true,
            ),
        ).toEqual({
            errorMsg: TOO_MANY_PLAYERS,
        });
    });
});
