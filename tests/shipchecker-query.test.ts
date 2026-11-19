import { describe, expect, it } from "vitest";
import type { ShipData } from "@/util/ShipCheckRules";
import {
    MAX_URL_SHIPS,
    normalizeName,
    parseInitialSelectionFromParams,
    resolveShipByName,
    stripDiacritics,
} from "@/util/ShipCheckerQuery";

const MOCK_SHIPS: ShipData[] = [
    {
        id: "ca-cl-0-des-moines",
        type: "ca-cl",
        rawName: "Des Moines",
        displayName: "Des Moines",
        aliases: ["Des Moines", "DM"],
        country: "U.S.A.",
        tier: 10,
        hasRadar: "Default",
        hasAircraft: false,
        isBan: false,
        addDate: "",
        model: "Des Moines",
    },
    {
        id: "ca-cl-1-minotaur",
        type: "ca-cl",
        rawName: "Minotaur",
        displayName: "Minotaur",
        aliases: ["Minotaur"],
        country: "U.K.",
        tier: 10,
        hasRadar: "Optional",
        hasAircraft: false,
        isBan: false,
        addDate: "",
        model: "Minotaur",
    },
    {
        id: "dd-2-kleber",
        type: "dd",
        rawName: "Kléber,Kleber",
        displayName: "Kléber",
        aliases: ["Kléber", "Kleber"],
        country: "France",
        tier: 10,
        hasRadar: "No",
        hasAircraft: false,
        isBan: true,
        addDate: "",
        model: "Kléber",
    },
    {
        id: "bb-3-preussen",
        type: "bb",
        rawName: "Preußen",
        displayName: "Preußen",
        aliases: ["Preußen"],
        country: "Germany",
        tier: 10,
        hasRadar: "No",
        hasAircraft: false,
        isBan: false,
        addDate: "",
        model: "Großer Kurfürst",
    },
];

function makeParams(params: Record<string, string | string[]>) {
    const usp = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
        if (Array.isArray(val)) {
            for (const v of val) usp.append(key, v);
        } else {
            usp.append(key, val);
        }
    }
    return usp;
}

describe("ShipCheckerQuery", () => {
    it("normalizes NFKC, whitespace, diacritics, and special Latin characters", () => {
        expect(normalizeName("  Des   Moines ")).toBe("des moines");
        expect(stripDiacritics("Kléber")).toBe("kleber");
        expect(stripDiacritics("Preußen")).toBe("preussen");
        expect(stripDiacritics("Gdańsk")).toBe("gdansk");
        expect(stripDiacritics("Błyskawica")).toBe("blyskawica");
    });

    it("resolves ships by displayName, alias, or stripped diacritics, but never by model", () => {
        expect(resolveShipByName("des moines", MOCK_SHIPS)?.id).toBe("ca-cl-0-des-moines");
        expect(resolveShipByName("DM", MOCK_SHIPS)?.id).toBe("ca-cl-0-des-moines");
        expect(resolveShipByName("Preussen", MOCK_SHIPS)?.id).toBe("bb-3-preussen");
        // Model name ('Großer Kurfürst') must NOT match Preußen to prevent false positives
        expect(resolveShipByName("Großer Kurfürst", MOCK_SHIPS)).toBeNull();
        expect(resolveShipByName("Grosser Kurfurst", MOCK_SHIPS)).toBeNull();
    });

    it("applies occurrence-based optional radar and reports unknown ships/radar", () => {
        const params = makeParams({
            ships: "Minotaur,Minotaur,Kleber,UnknownShip",
            radar: "Minotaur,UnselectedRadarShip",
        });

        const parsed = parseInitialSelectionFromParams(params, MOCK_SHIPS);

        expect(parsed.entries).toHaveLength(3);
        // 1st Minotaur gets radar ON, 2nd Minotaur stays OFF
        expect(parsed.entries[0].ship.displayName).toBe("Minotaur");
        expect(parsed.entries[0].useOptionalRadar).toBe(true);
        expect(parsed.entries[1].ship.displayName).toBe("Minotaur");
        expect(parsed.entries[1].useOptionalRadar).toBe(false);
        // Sheet-banned ship (Kléber) is still loaded so violations are visible
        expect(parsed.entries[2].ship.displayName).toBe("Kléber");

        expect(parsed.unknownShips).toEqual(["UnknownShip"]);
        expect(parsed.unknownRadarShips).toEqual(["UnselectedRadarShip"]);
        expect(parsed.truncatedCount).toBe(0);
    });

    it("truncates ships beyond MAX_URL_SHIPS (30) to prevent UI DoS", () => {
        const thirtyFiveShips = Array.from({ length: 35 }, () => "Des Moines").join(",");
        const parsed = parseInitialSelectionFromParams(
            makeParams({ ships: thirtyFiveShips }),
            MOCK_SHIPS,
        );

        expect(parsed.entries).toHaveLength(MAX_URL_SHIPS);
        expect(parsed.truncatedCount).toBe(5);
    });
});
