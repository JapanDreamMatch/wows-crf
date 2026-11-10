export const SHIP_TYPES = ["dd", "cr", "bb", "cv", "sb"] as const;

export type ShipType = (typeof SHIP_TYPES)[number];
export type RadarCapability = "Default" | "Optional" | "No";
export type RuleKind = "namePattern" | "shipName" | "country" | "type" | "feature" | "special";
export type ShipCheckerLocale = "en" | "ja";

export interface ShipData {
    id: string;
    type: ShipType;
    rawName: string;
    displayName: string;
    aliases: string[];
    country: string;
    tier: number | null;
    hasRader: RadarCapability;
    hasAircraft: boolean;
    isBan: boolean;
    addDate: string;
    model: string;
}

export interface ShipRule {
    id: string;
    kind: RuleKind;
    targets: string[];
    limit: number;
    raw: string;
}

export interface ShipRuleSet {
    shipAmount: number;
    rules: ShipRule[];
}

export interface SelectedShipEntry {
    ship: ShipData;
    useOptionalRadar: boolean;
}

export interface RuleCounter {
    id: string;
    label: string;
    actual: number;
    limit: number;
    isViolation: boolean;
}

export interface RuleEvaluation {
    counters: RuleCounter[];
    violations: RuleCounter[];
}

export interface AddAvailability {
    allowed: boolean;
    reason: string;
}

export const SHIP_TYPE_LABELS: Record<ShipType, string> = {
    dd: "DD",
    cr: "CA/CL",
    bb: "BB",
    cv: "CV",
    sb: "SB",
};

const SHIP_TYPE_SET = new Set<string>(SHIP_TYPES);
const DEFAULT_LOCALE: ShipCheckerLocale = "en";

function normalizeText(value: string): string {
    return value.trim().toLowerCase();
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getShipNameCandidates(ship: ShipData): string[] {
    const names = new Set<string>();
    names.add(normalizeText(ship.displayName));
    names.add(normalizeText(ship.rawName));
    for (const alias of ship.aliases) {
        names.add(normalizeText(alias));
    }
    if (ship.model) {
        names.add(normalizeText(ship.model));
    }
    return Array.from(names).filter(Boolean);
}

function matchesNamePattern(ship: ShipData, pattern: string): boolean {
    const normalizedPattern = normalizeText(pattern).replace(/^\*/, "");
    if (!normalizedPattern) {
        return false;
    }

    const regex = new RegExp(`(^|[\\s\\-_/])${escapeRegExp(normalizedPattern)}($|[\\s\\-_/])`, "i");
    return getShipNameCandidates(ship).some((name) => regex.test(name));
}

function matchesShipName(ship: ShipData, names: string[]): boolean {
    const allowedNames = new Set(names.map((name) => normalizeText(name)).filter(Boolean));
    if (allowedNames.size === 0) {
        return false;
    }
    return getShipNameCandidates(ship).some((name) => allowedNames.has(name));
}

function matchesCountry(ship: ShipData, countries: string[]): boolean {
    const allowedCountries = new Set(countries.map((country) => normalizeText(country)).filter(Boolean));
    return allowedCountries.has(normalizeText(ship.country));
}

function matchesType(ship: ShipData, shipTypes: string[]): boolean {
    const allowedShipTypes = new Set(shipTypes.map((shipType) => normalizeText(shipType)).filter(Boolean));
    return allowedShipTypes.has(normalizeText(ship.type));
}

function matchesFeature(entry: SelectedShipEntry, featureName: string): boolean {
    const normalized = normalizeText(featureName);
    if (normalized === "hasrader") {
        return entry.ship.hasRader === "Default" || entry.ship.hasRader === "Optional";
    }
    if (normalized === "hasaircraft") {
        return entry.ship.hasAircraft;
    }
    return false;
}

function matchesSpecial(entry: SelectedShipEntry, specialName: string): boolean {
    const normalized = normalizeText(specialName);
    if (normalized === "allrader") {
        return entry.ship.hasRader === "Default" || (entry.ship.hasRader === "Optional" && entry.useOptionalRadar);
    }
    if (normalized === "tier11") {
        return entry.ship.tier === 11;
    }
    return false;
}

function countMatches(rule: ShipRule, entries: SelectedShipEntry[]): number {
    if (rule.kind === "namePattern") {
        return entries.filter((entry) => rule.targets.some((target) => matchesNamePattern(entry.ship, target))).length;
    }

    if (rule.kind === "shipName") {
        return entries.filter((entry) => matchesShipName(entry.ship, rule.targets)).length;
    }

    if (rule.kind === "country") {
        return entries.filter((entry) => matchesCountry(entry.ship, rule.targets)).length;
    }

    if (rule.kind === "type") {
        return entries.filter((entry) => matchesType(entry.ship, rule.targets)).length;
    }

    if (rule.kind === "feature") {
        return entries.filter((entry) => rule.targets.some((target) => matchesFeature(entry, target))).length;
    }

    if (rule.kind === "special") {
        return entries.filter((entry) => rule.targets.some((target) => matchesSpecial(entry, target))).length;
    }

    return 0;
}

function getFeatureLabel(target: string, locale: ShipCheckerLocale): string {
    const normalized = normalizeText(target);
    if (normalized === "hasrader") {
        return locale === "ja" ? "レーダー搭載可能艦" : "Radar capable ships";
    }
    if (normalized === "hasaircraft") {
        return locale === "ja" ? "操作可能な航空機を持つ艦艇" : "Ships with controllable aircraft";
    }
    return target;
}

function getSpecialLabel(target: string, locale: ShipCheckerLocale): string {
    const normalized = normalizeText(target);
    if (normalized === "allrader") {
        return locale === "ja" ? "実際にレーダーを使用する艦艇" : "Ships actually sailing with radar";
    }
    if (normalized === "tier11") {
        return locale === "ja" ? "Tier 11 艦艇" : "Tier 11 ships";
    }
    return target;
}

export function getRuleLabel(rule: ShipRule, locale: ShipCheckerLocale = DEFAULT_LOCALE): string {
    if (rule.kind === "namePattern") {
        if (locale === "ja") {
            return `艦名パターン (${rule.targets.join(", ")}) <= ${rule.limit}`;
        }
        return `Name pattern (${rule.targets.join(", ")}) <= ${rule.limit}`;
    }

    if (rule.kind === "shipName") {
        if (locale === "ja") {
            return `艦名 (${rule.targets.join(", ")}) <= ${rule.limit}`;
        }
        return `Ship names (${rule.targets.join(", ")}) <= ${rule.limit}`;
    }

    if (rule.kind === "country") {
        if (locale === "ja") {
            return `国家 (${rule.targets.join(", ")}) <= ${rule.limit}`;
        }
        return `Countries (${rule.targets.join(", ")}) <= ${rule.limit}`;
    }

    if (rule.kind === "type") {
        const labels = rule.targets.map((target) => {
            const normalized = target.trim().toLowerCase();
            return normalized in SHIP_TYPE_LABELS ? SHIP_TYPE_LABELS[normalized as ShipType] : target;
        });
        if (locale === "ja") {
            return `艦種 (${labels.join(", ")}) <= ${rule.limit}`;
        }
        return `Ship types (${labels.join(", ")}) <= ${rule.limit}`;
    }

    if (rule.kind === "feature") {
        const labels = rule.targets.map((target) => getFeatureLabel(target, locale));
        return `${labels.join(" + ")} <= ${rule.limit}`;
    }

    if (rule.kind === "special") {
        const labels = rule.targets.map((target) => getSpecialLabel(target, locale));
        return `${labels.join(" + ")} <= ${rule.limit}`;
    }

    return `${rule.raw} <= ${rule.limit}`;
}

export function classifyRuleKind(tokens: string[], countries: string[]): RuleKind {
    const normalizedTokens = tokens.map((token) => normalizeText(token)).filter(Boolean);
    if (normalizedTokens.length === 0) {
        return "shipName";
    }

    const firstToken = normalizedTokens[0];

    if (firstToken.startsWith("*")) {
        return "namePattern";
    }

    if (normalizedTokens.length === 1) {
        if (firstToken === "hasrader" || firstToken === "hasaircraft") {
            return "feature";
        }

        if (firstToken === "allrader" || firstToken === "tier11" || firstToken === "shipamount") {
            return "special";
        }
    }

    if (normalizedTokens.every((token) => SHIP_TYPE_SET.has(token))) {
        return "type";
    }

    const countrySet = new Set(countries.map((country) => normalizeText(country)).filter(Boolean));
    if (normalizedTokens.every((token) => countrySet.has(token))) {
        return "country";
    }

    return "shipName";
}

export function evaluateShipRules(
    entries: SelectedShipEntry[],
    ruleSet: ShipRuleSet,
    locale: ShipCheckerLocale = DEFAULT_LOCALE,
): RuleEvaluation {
    const counters: RuleCounter[] = [];
    const sheetBanCount = entries.filter((entry) => entry.ship.isBan).length;

    counters.push({
        id: "shipamount",
        label: locale === "ja" ? `艦艇数 <= ${ruleSet.shipAmount}` : `Ship amount <= ${ruleSet.shipAmount}`,
        actual: entries.length,
        limit: ruleSet.shipAmount,
        isViolation: entries.length > ruleSet.shipAmount,
    });

    counters.push({
        id: "sheet-ban",
        label:
            locale === "ja"
                ? "シートBAN艦艇が含まれていない"
                : "No sheet-banned ships are included",
        actual: sheetBanCount,
        limit: 0,
        isViolation: sheetBanCount > 0,
    });

    for (const rule of ruleSet.rules) {
        const actual = countMatches(rule, entries);
        counters.push({
            id: rule.id,
            label: getRuleLabel(rule, locale),
            actual,
            limit: rule.limit,
            isViolation: actual > rule.limit,
        });
    }

    const violations = counters.filter((counter) => counter.isViolation);
    return { counters, violations };
}

export function getAddAvailability(
    currentEntries: SelectedShipEntry[],
    candidateShip: ShipData,
    ruleSet: ShipRuleSet,
    locale: ShipCheckerLocale = DEFAULT_LOCALE,
): AddAvailability {
    if (candidateShip.isBan) {
        return {
            allowed: false,
            reason: locale === "ja" ? "この艦艇はシート上でBANされています。" : "This ship is banned in the sheet.",
        };
    }

    if (currentEntries.length >= ruleSet.shipAmount) {
        return {
            allowed: false,
            reason:
                locale === "ja"
                    ? `艦艇数の上限に達しています (${ruleSet.shipAmount})。`
                    : `Ship amount limit reached (${ruleSet.shipAmount}).`,
        };
    }

    const simulatedEntries: SelectedShipEntry[] = [
        ...currentEntries,
        {
            ship: candidateShip,
            useOptionalRadar: false,
        },
    ];

    const simulatedResult = evaluateShipRules(simulatedEntries, ruleSet, locale);
    const firstViolation = simulatedResult.violations[0];

    if (firstViolation) {
        return {
            allowed: false,
            reason: locale === "ja" ? `違反します: ${firstViolation.label}` : `Would violate: ${firstViolation.label}`,
        };
    }

    return {
        allowed: true,
        reason: "",
    };
}
