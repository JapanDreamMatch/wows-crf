import { describe, expect, it } from "vitest";
import {
    classifyRuleKind,
    evaluateShipRules,
    getAddAvailability,
    getRuleLabel,
    type SelectedShipEntry,
    type ShipData,
    type ShipRule,
    type ShipRuleSet,
} from "@/util/ShipCheckRules";

const DES_MOINES: ShipData = {
    id: "ca-cl-1",
    type: "ca-cl",
    rawName: "Des Moines",
    displayName: "Des Moines",
    aliases: ["Des Moines"],
    country: "U.S.A.",
    tier: 10,
    hasRadar: "Default",
    hasAircraft: false,
    isBan: false,
    addDate: "",
    model: "Des Moines",
};

const MINOTAUR: ShipData = {
    id: "ca-cl-2",
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
};

const BANNED_SHIP: ShipData = {
    id: "cv-1",
    type: "cv",
    rawName: "Hakuryu",
    displayName: "Hakuryu",
    aliases: ["Hakuryu"],
    country: "Japan",
    tier: 10,
    hasRadar: "No",
    hasAircraft: true,
    isBan: true,
    addDate: "",
    model: "Hakuryu",
};

const SAMPLE_RULESET: ShipRuleSet = {
    shipAmount: 2,
    rules: [
        {
            id: "rule-allradar",
            kind: "special",
            targets: ["allRadar"],
            limit: 1,
            raw: "allRadar",
        },
        {
            id: "rule-hasradar",
            kind: "feature",
            targets: ["hasRadar"],
            limit: 2,
            raw: "hasRadar",
        },
    ],
};

describe("ShipCheckRules (Rule Classification & Evaluation)", () => {
    it("classifies rule tokens accurately using canonical hasRadar / allRadar / ca-cl spelling", () => {
        const countries = ["Japan", "U.S.A.", "U.K."];

        expect(classifyRuleKind(["*ARP"], countries)).toBe("namePattern");
        expect(classifyRuleKind(["hasRadar"], countries)).toBe("feature");
        expect(classifyRuleKind(["hasAircraft"], countries)).toBe("feature");
        expect(classifyRuleKind(["allRadar"], countries)).toBe("special");
        expect(classifyRuleKind(["tier11"], countries)).toBe("special");
        expect(classifyRuleKind(["dd", "ca-cl"], countries)).toBe("type");
        expect(classifyRuleKind(["Japan", "U.S.A."], countries)).toBe("country");
        expect(classifyRuleKind(["Des Moines", "Salem"], countries)).toBe("shipName");
    });

    it("distinguishes hasRadar (capable) from allRadar (actually sailing with radar)", () => {
        const entriesWithoutOptionalRadar: SelectedShipEntry[] = [
            { ship: DES_MOINES, useOptionalRadar: false },
            { ship: MINOTAUR, useOptionalRadar: false },
        ];

        const eval1 = evaluateShipRules(entriesWithoutOptionalRadar, SAMPLE_RULESET, "ja");
        expect(eval1.violations).toHaveLength(0);

        // Enabling optional radar on Minotaur causes allRadar to become 2 > 1
        const entriesWithOptionalRadar: SelectedShipEntry[] = [
            { ship: DES_MOINES, useOptionalRadar: false },
            { ship: MINOTAUR, useOptionalRadar: true },
        ];
        const eval2 = evaluateShipRules(entriesWithOptionalRadar, SAMPLE_RULESET, "ja");
        expect(eval2.violations.map((v) => v.id)).toEqual(["rule-allradar"]);
    });

    it("evaluates ca-cl cruiser type rules and formats CA/CL labels for ja and en", () => {
        const cruiserRule: ShipRule = {
            id: "rule-cacl",
            kind: "type",
            targets: ["ca-cl"],
            limit: 1,
            raw: "ca-cl,1",
        };
        const cruiserRuleSet: ShipRuleSet = {
            shipAmount: 7,
            rules: [cruiserRule],
        };
        const entries: SelectedShipEntry[] = [
            { ship: DES_MOINES, useOptionalRadar: false },
            { ship: MINOTAUR, useOptionalRadar: false },
        ];

        const evalResult = evaluateShipRules(entries, cruiserRuleSet, "ja");
        expect(evalResult.violations.map((v) => v.id)).toEqual(["rule-cacl"]);
        expect(getRuleLabel(cruiserRule, "ja")).toBe("艦種 (CA/CL) <= 1");
        expect(getRuleLabel(cruiserRule, "en")).toBe("Ship types (CA/CL) <= 1");
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
