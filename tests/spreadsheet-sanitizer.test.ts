import { describe, expect, it, vi } from "vitest";
import {
    assertSafeSheetCellString,
    hasLeadingFormulaTrigger,
    setCellStringSafe,
    validateSafeSheetText,
} from "@/util/SpreadsheetSanitizer";
import { sanitizeErrorMessage } from "@/util/SafeLogger";

describe("SpreadsheetSanitizer & SafeLogger", () => {
    describe("hasLeadingFormulaTrigger / validateSafeSheetText", () => {
        it("rejects leading '=' with or without leading whitespace and control chars", () => {
            expect(hasLeadingFormulaTrigger("=1+1")).toBe(true);
            expect(hasLeadingFormulaTrigger("  =SUM(A1:A2)")).toBe(true);
            expect(hasLeadingFormulaTrigger("\t=A1")).toBe(true);
            expect(hasLeadingFormulaTrigger("abc\n=A1")).toBe(true);
            expect(hasLeadingFormulaTrigger("abc\rdef")).toBe(true);
            expect(validateSafeSheetText("=A1", "コメント")).not.toBeNull();
            expect(() => assertSafeSheetCellString("=A1")).toThrow();
        });

        it("allows legitimate text including '@' social handles, hyphens, and URLs", () => {
            expect(hasLeadingFormulaTrigger("")).toBe(false);
            expect(hasLeadingFormulaTrigger("@captain_jdm")).toBe(false);
            expect(hasLeadingFormulaTrigger("-team-alpha")).toBe(false);
            expect(hasLeadingFormulaTrigger("https://storage.googleapis.com/bucket/logos/JDM.png")).toBe(false);
            expect(validateSafeSheetText("@captain_jdm", "代表者連絡先")).toBeNull();
            expect(assertSafeSheetCellString("@captain_jdm")).toBe("@captain_jdm");
        });
    });

    describe("setCellStringSafe", () => {
        it("writes via stringValue setter instead of value setter", () => {
            const cell = { stringValue: undefined as string | undefined };
            setCellStringSafe(cell, "Team Alpha");
            expect(cell.stringValue).toBe("Team Alpha");

            expect(() => setCellStringSafe(cell, "=1+1")).toThrow();
        });
    });

    describe("sanitizeErrorMessage", () => {
        it("masks application_id and secret query params", () => {
            const raw = "Request failed: https://api.example.com/wows/?application_id=dummyappkey123&search=foo";
            const sanitized = sanitizeErrorMessage(raw);
            expect(sanitized).not.toContain("dummyappkey123");
            expect(sanitized).toContain("application_id=[REDACTED]");
        });
    });
});
