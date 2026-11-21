import { describe, expect, it } from "vitest";
import {
    COMMENT_MAX_LENGTH,
    CONTACT_MAX_LENGTH,
    TEAM_NAME_MAX_LENGTH,
    TEAM_NICKNAME_MAX_LENGTH,
    TEAM_NICKNAME_MIN_LENGTH,
    extractFormString,
    hasDuplicateSheetName,
    validateComment,
    validateContact,
    validatePlayerIgn,
    validatePlayerRoster,
    validateTeamName,
    validateTeamNickName,
} from "@/util/TeamValidation";

describe("TeamValidation", () => {
    describe("validateTeamName", () => {
        it("accepts valid team names up to 50 characters", () => {
            expect(validateTeamName("Japan Dream Match Team")).toBeNull();
            expect(validateTeamName("あ".repeat(TEAM_NAME_MAX_LENGTH))).toBeNull();
        });

        it("rejects empty or whitespace-only team names", () => {
            expect(validateTeamName("")).toBe("チーム名を入力してください");
            expect(validateTeamName("   ")).toBe("チーム名を入力してください");
        });

        it("rejects team names exceeding 50 characters", () => {
            expect(validateTeamName("A".repeat(TEAM_NAME_MAX_LENGTH + 1))).toBe(
                `${TEAM_NAME_MAX_LENGTH}字以内で入力してください`,
            );
        });
    });

    describe("validateTeamNickName", () => {
        it("accepts valid alphanumeric, hyphen, and underscore nicknames (2..5 chars)", () => {
            expect(validateTeamNickName("AB")).toBeNull();
            expect(validateTeamNickName("JDM_9")).toBeNull();
            expect(validateTeamNickName("A-1_b")).toBeNull();
        });

        it("rejects empty, too short (<2), or too long (>5) nicknames", () => {
            expect(validateTeamNickName("")).toBe("チーム略名を入力してください");
            expect(validateTeamNickName("A")).toBe(
                `${TEAM_NICKNAME_MIN_LENGTH}文字以上で入力してください`,
            );
            expect(validateTeamNickName("ABCDEF")).toBe(
                `${TEAM_NICKNAME_MAX_LENGTH}字以内で入力してください`,
            );
        });

        it("strictly rejects '@' to protect the @init sheet exclusion boundary", () => {
            expect(validateTeamNickName("@init")).not.toBeNull();
            expect(validateTeamNickName("@abc")).not.toBeNull();
            expect(validateTeamNickName("ab@c")).not.toBeNull();
        });

        it("rejects path traversal, spaces, spreadsheet formula prefixes, and full-width chars", () => {
            expect(validateTeamNickName("../a")).not.toBeNull();
            expect(validateTeamNickName("A B")).not.toBeNull();
            expect(validateTeamNickName("=CMD")).not.toBeNull();
            expect(validateTeamNickName("あいう")).not.toBeNull();
        });
    });

    describe("validateContact & validateComment", () => {
        it("requires non-empty contact within length limit and allows '@' handles", () => {
            expect(validateContact("@captain_discord")).toBeNull();
            expect(validateContact("")).not.toBeNull();
            expect(validateContact("   ")).not.toBeNull();
            expect(validateContact("a".repeat(CONTACT_MAX_LENGTH + 1))).not.toBeNull();
            expect(validateContact("=SUM(1,2)")).not.toBeNull();
        });

        it("allows empty comment and rejects oversized or formula-prefixed comments", () => {
            expect(validateComment("")).toBeNull();
            expect(validateComment("よろしくお願いします")).toBeNull();
            expect(validateComment("a".repeat(COMMENT_MAX_LENGTH + 1))).not.toBeNull();
            expect(validateComment(" =1+1")).not.toBeNull();
        });
    });

    describe("validatePlayerIgn & validatePlayerRoster", () => {
        it("validates IGN format and length", () => {
            expect(validatePlayerIgn("Player_01", true)).toBeNull();
            expect(validatePlayerIgn("", false)).toBeNull();
            expect(validatePlayerIgn("", true)).not.toBeNull();
            expect(validatePlayerIgn("ab", true)).not.toBeNull();
            expect(validatePlayerIgn("bad-name!", true)).not.toBeNull();
        });

        it("rejects duplicate IGNs case-insensitively and requires players 1..7", () => {
            const validRoster = [
                "Player_1", "Player_2", "Player_3", "Player_4",
                "Player_5", "Player_6", "Player_7", "", "", "",
            ];
            expect(validatePlayerRoster(validRoster)).toBeNull();

            const dupRoster = [
                "Player_1", "player_1", "Player_3", "Player_4",
                "Player_5", "Player_6", "Player_7", "", "", "",
            ];
            expect(validatePlayerRoster(dupRoster)).not.toBeNull();

            const missingReq = [
                "Player_1", "Player_2", "Player_3", "Player_4",
                "Player_5", "Player_6", "", "Player_8", "", "",
            ];
            expect(validatePlayerRoster(missingReq)).not.toBeNull();
        });
    });

    describe("extractFormString & hasDuplicateSheetName", () => {
        it("rejects File values submitted in string form fields", () => {
            const fd = new FormData();
            fd.append("password", new File(["x"], "x.txt"));
            fd.append("teamName", "Valid Team");
            expect(extractFormString(fd, "password")).toEqual({ ok: false });
            expect(extractFormString(fd, "teamName")).toEqual({ ok: true, value: "Valid Team" });
            expect(extractFormString(fd, "missing")).toEqual({ ok: true, value: "" });
        });

        it("checks duplicate team nicknames case-insensitively while ignoring '@' sheets", () => {
            const sheets = ["@init", "JDM", "Alpha"];
            expect(hasDuplicateSheetName(sheets, "jdm")).toBe(true);
            expect(hasDuplicateSheetName(sheets, "init")).toBe(false);
            expect(hasDuplicateSheetName(sheets, "BETA")).toBe(false);
        });
    });
});
