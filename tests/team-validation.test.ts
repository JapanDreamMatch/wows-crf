import { describe, expect, it } from "vitest";
import {
    TEAM_NAME_MAX_LENGTH,
    TEAM_NICKNAME_MAX_LENGTH,
    TEAM_NICKNAME_MIN_LENGTH,
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
});
