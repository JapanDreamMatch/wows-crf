import { describe, expect, it } from "vitest";
import {
    classifyRuleKind,
    evaluateShipRules,
    getAddAvailability,
    type SelectedShipEntry,
    type ShipData,
    type ShipRuleSet,
} from "@/util/ShipCheckRules";

const DES_MOINES: ShipData = {
    id: "cr-1",
    type: "cr",
    rawName: "Des Moines",
    displayName: "Des Moines",
    aliases: ["Des Moines"],
    country: "U.S.A.",
    tier: 10,
    hasRader: "Default",
    hasAircraft: false,
    isBan: false,
    addDate: "",
    model: "Des Moines",
};

const MINOTAUR: ShipData = {
    id: "cr-2",
    type: "cr",
    rawName: "Minotaur",
    displayName: "Minotaur",
    aliases: ["Minotaur"],
    country: "U.K.",
    tier: 10,
    hasRader: "Optional",
    hasAircraft: false,
    isBan: false,
    addDate: "",
    model: "Minotaur",
};

const BANNED_SHIP: ShipData = {
    id: "cv-1",
    type: "cv",
    rawName: "Hakuryu",
    displayName: "Hakuryu",
    aliases: ["Hakuryu"],
    country: "Japan",
    tier: 10,
    hasRader: "No",
    hasAircraft: true,
    isBan: true,
    addDate: "",
    model: "Hakuryu",
};

const SAMPLE_RULESET: ShipRuleSet = {
    shipAmount: 2,
    rules: [
        {
            id: "rule-allrader",
            kind: "special",
            targets: ["allRader"],
            limit: 1,
            raw: "allRader",
        },
        {
            id: "rule-hasrader",
            kind: "feature",
            targets: ["hasRader"],
            limit: 2,
            raw: "hasRader",
        },
    ],
};

describe("ShipCheckRules (Backwards Compatibility & Rule Evaluation)", () => {
    it("classifies rule tokens accurately while preserving hasRader / allRader spelling", () => {
        const countries = ["Japan", "U.S.A.", "U.K."];

        expect(classifyRuleKind(["*ARP"], countries)).toBe("namePattern");
        expect(classifyRuleKind(["hasRader"], countries)).toBe("feature");
        expect(classifyRuleKind(["hasAircraft"], countries)).toBe("feature");
        expect(classifyRuleKind(["allRader"], countries)).toBe("special");
        expect(classifyRuleKind(["tier11"], countries)).toBe("special");
        expect(classifyRuleKind(["dd", "cr"], countries)).toBe("type");
        expect(classifyRuleKind(["Japan", "U.S.A."], countries)).toBe("country");
        expect(classifyRuleKind(["Des Moines", "Salem"], countries)).toBe("shipName");
    });

    it("distinguishes hasRader (capable) from allRader (actually sailing with radar)", () => {
        const entriesWithoutOptionalRadar: SelectedShipEntry[] = [
            { ship: DES_MOINES, useOptionalRadar: false },
            { ship: MINOTAUR, useOptionalRadar: false },
        ];

        const eval1 = evaluateShipRules(entriesWithoutOptionalRadar, SAMPLE_RULESET, "ja");
        expect(eval1.violations).toHaveLength(0);

        // Enabling optional radar on Minotaur causes allRader to become 2 > 1
        const entriesWithOptionalRadar: SelectedShipEntry[] = [
            { ship: DES_MOINES, useOptionalRadar: false },
            { ship: MINOTAUR, useOptionalRadar: true },
        ];
        const eval2 = evaluateShipRules(entriesWithOptionalRadar, SAMPLE_RULESET, "ja");
        expect(eval2.violations.map((v) => v.id)).toEqual(["rule-allrader"]);
    });

    it("flags sheet-banned ships and blocks adding banned or over-limit ships via getAddAvailability", () => {
        const banAvail = getAddAvailability([], BANNED_SHIP, SAMPLE_RULESET, "ja");
        expect(banAvail.allowed).toBe(false);

        const evalWithBan = evaluateShipRules(
            [{ ship: BANNED_SHIP, useOptionalRadar: false }],
            SAMPLE_RULESET,
            "ja",
        );
        expect(evalWithBan.violations.some((v) => v.id === "sheet-ban")).toBe(true);
    });
});
