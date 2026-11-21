import { describe, expect, it, vi } from "vitest";
import { ARGON2_CONFIG, MIN_PASSWORD_LENGTH } from "@/util/Argon2Service";
import { MAX_LOGO_SIZE } from "@/util/ImageValidator";
import { REGISTER_HEADER, REGISTER_PERIOD } from "@/util/SheetHeader";
import { MAX_URL_SHIPS } from "@/util/ShipCheckerQuery";
import { GoogleSpreadsheetService } from "@/util/SpreadSheetService";
import { LOCK_DURATION_MS, MAX_AUTH_FAILURES } from "@/util/TeamAuth";

describe("Security & Spreadsheet Contract Invariants", () => {
    it("REGISTER_HEADER maintains the exact 8-column layout (A..H) for G2 LogoURL and H2..H5 Salt/Hash/Lock", () => {
        expect(REGISTER_HEADER).toEqual([
            "Type",        // A (Col 0)
            "IGN",         // B (Col 1)
            "ID",          // C (Col 2)
            "WinRate",     // D (Col 3)
            "Contact",     // E (Col 4)
            "Comment",     // F (Col 5)
            "LogoURL",     // G (Col 6 -> G2)
            "SaltAndHash", // H (Col 7 -> H2=Salt, H3=Hash, H4=FailCount/Lock, H5=LockUntil)
        ]);
        expect(REGISTER_HEADER).toHaveLength(8);
    });

    it("REGISTER_PERIOD maintains the expected 3 columns", () => {
        expect(REGISTER_PERIOD).toEqual(["StartDate", "EndDate", "Ignore(debug)"]);
    });

    it("Argon2id configuration meets minimum OWASP security thresholds", () => {
        expect(MIN_PASSWORD_LENGTH).toBeGreaterThanOrEqual(8);
        expect(ARGON2_CONFIG.memorySize).toBeGreaterThanOrEqual(19456);
        expect(ARGON2_CONFIG.iterations).toBeGreaterThanOrEqual(2);
        expect(ARGON2_CONFIG.parallelism).toBe(1);
        expect(ARGON2_CONFIG.hashLength).toBe(32);
        expect(ARGON2_CONFIG.saltByteLength).toBe(16);
    });

    it("Brute-force lock policy enforces 10 max failures and 1-hour lock duration", () => {
        expect(MAX_AUTH_FAILURES).toBe(10);
        expect(LOCK_DURATION_MS).toBe(60 * 60 * 1000);
    });

    it("Upload and URL query DoS limits are strictly bounded", () => {
        expect(MAX_LOGO_SIZE).toBe(20 * 1024 * 1024);
        expect(MAX_URL_SHIPS).toBe(30);
    });

    it("GoogleSpreadsheetService.addRows enforces raw: true by default to prevent formula injection", async () => {
        const service = new GoogleSpreadsheetService("dummy-sheet-id");
        const mockAddRows = vi.fn().mockResolvedValue([]);
        (service as unknown as { doc: { sheetsByTitle: Record<string, unknown> } }).doc = {
            sheetsByTitle: {
                JDM: { addRows: mockAddRows },
            },
        };

        await service.addRows("JDM", [{ Type: "TeamInfo", IGN: "JDM" }]);
        expect(mockAddRows).toHaveBeenCalledWith(
            [{ Type: "TeamInfo", IGN: "JDM" }],
            { raw: true },
        );
    });
});
