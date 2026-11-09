import { NextResponse } from "next/server";
import { GoogleSpreadsheetService } from "@/util/SpreadSheetService";
import {
    SHIP_TYPES,
    classifyRuleKind,
    type RadarCapability,
    type ShipData,
    type ShipRule,
    type ShipRuleSet,
    type ShipType,
} from "@/util/ShipCheckRules";

export const dynamic = "force-dynamic";

const MAX_SCAN_ROWS = 500;

function toCellText(value: unknown): string {
    if (value === null || value === undefined) {
        return "";
    }
    return String(value).trim();
}

function parseCsv(value: string): string[] {
    return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

function parseTier(value: string): number | null {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
}

function parseRadarCapability(value: string): RadarCapability {
    const normalized = value.trim().toLowerCase();
    if (normalized === "default") {
        return "Default";
    }
    if (normalized === "optional") {
        return "Optional";
    }
    return "No";
}

function parseBooleanYes(value: string): boolean {
    return value.trim().toLowerCase() === "yes";
}

function parseRuleRow(rawRule: string, rawLimit: string): { tokens: string[]; limit: number; raw: string } | null {
    const tokens = parseCsv(rawRule);
    if (tokens.length === 0) {
        return null;
    }

    const normalizedRawLimit = rawLimit.trim();
    if (normalizedRawLimit !== "") {
        const parsedLimitFromColumn = Number(normalizedRawLimit);
        if (Number.isNaN(parsedLimitFromColumn)) {
            return null;
        }
        return {
            tokens,
            limit: parsedLimitFromColumn,
            raw: `${rawRule},${normalizedRawLimit}`,
        };
    }

    const possibleLimit = Number(tokens[tokens.length - 1]);
    if (!Number.isNaN(possibleLimit) && tokens.length >= 2) {
        return {
            tokens: tokens.slice(0, -1),
            limit: possibleLimit,
            raw: rawRule,
        };
    }

    return null;
}

function toShipRowRecord(row: unknown): Record<string, unknown> {
    return row as Record<string, unknown>;
}

function readRowValue(row: Record<string, unknown>, key: string): string {
    const directValue = toCellText(row[key]);
    if (directValue) {
        return directValue;
    }

    const lowerCaseValue = toCellText(row[key.toLowerCase()]);
    if (lowerCaseValue) {
        return lowerCaseValue;
    }

    const rowWithGetter = row as Record<string, unknown> & {
        get?: (columnName: string) => unknown;
    };
    if (typeof rowWithGetter.get === "function") {
        return toCellText(rowWithGetter.get(key));
    }

    return "";
}

function buildShipId(type: ShipType, index: number, name: string): string {
    const slug =
        name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "") || "ship";
    return `${type}-${index}-${slug}`;
}

async function loadCountryList(spreadSheet: GoogleSpreadsheetService): Promise<string[]> {
    const countrySheet = await spreadSheet.getSheet("country");
    if (!countrySheet) {
        throw new Error("Sheet 'country' was not found.");
    }
    await countrySheet.loadCells(`A1:A${MAX_SCAN_ROWS}`);

    const countries: string[] = [];
    let emptyStreak = 0;

    for (let rowIndex = 0; rowIndex < MAX_SCAN_ROWS; rowIndex++) {
        const value = toCellText(countrySheet.getCell(rowIndex, 0).value);
        if (!value) {
            emptyStreak += 1;
            if (countries.length > 0 && emptyStreak >= 20) {
                break;
            }
            continue;
        }

        emptyStreak = 0;
        if (value.toLowerCase() === "country") {
            continue;
        }
        countries.push(value);
    }

    return countries;
}

async function loadShips(spreadSheet: GoogleSpreadsheetService): Promise<ShipData[]> {
    const ships: ShipData[] = [];

    for (const type of SHIP_TYPES) {
        const rows = await spreadSheet.getRows(type);
        rows.forEach((row, index) => {
            const rowData = toShipRowRecord(row);
            const rawName = readRowValue(rowData, "name");
            if (!rawName) {
                return;
            }

            const aliases = parseCsv(rawName);
            const displayName = aliases[0] ?? rawName;
            const country = readRowValue(rowData, "country");
            const tier = parseTier(readRowValue(rowData, "tier"));
            const hasRader = parseRadarCapability(readRowValue(rowData, "hasRader"));
            const hasAircraft = parseBooleanYes(readRowValue(rowData, "hasAircraft"));
            const isBan = parseBooleanYes(readRowValue(rowData, "isBan"));
            const addDate = readRowValue(rowData, "addDate");
            const model = readRowValue(rowData, "model");

            ships.push({
                id: buildShipId(type, index, displayName),
                type,
                rawName,
                displayName,
                aliases,
                country,
                tier,
                hasRader,
                hasAircraft,
                isBan,
                addDate,
                model,
            });
        });
    }

    ships.sort((left, right) => {
        const leftTypeOrder = SHIP_TYPES.indexOf(left.type);
        const rightTypeOrder = SHIP_TYPES.indexOf(right.type);
        if (leftTypeOrder !== rightTypeOrder) {
            return leftTypeOrder - rightTypeOrder;
        }
        return left.displayName.localeCompare(right.displayName, "en");
    });

    return ships;
}

async function loadRules(spreadSheet: GoogleSpreadsheetService, countries: string[]): Promise<ShipRuleSet> {
    const rulesSheet = await spreadSheet.getSheet("rules");
    if (!rulesSheet) {
        throw new Error("Sheet 'rules' was not found.");
    }
    await rulesSheet.loadCells(`A1:C${MAX_SCAN_ROWS}`);

    const rules: ShipRule[] = [];
    let shipAmount = 7;
    let emptyStreak = 0;

    for (let rowIndex = 0; rowIndex < MAX_SCAN_ROWS; rowIndex++) {
        const ruleText = toCellText(rulesSheet.getCell(rowIndex, 0).value);
        const limitText = toCellText(rulesSheet.getCell(rowIndex, 1).value);

        if (!ruleText && !limitText) {
            emptyStreak += 1;
            if (rules.length > 0 && emptyStreak >= 20) {
                break;
            }
            continue;
        }

        emptyStreak = 0;

        if (!ruleText) {
            continue;
        }

        const parsed = parseRuleRow(ruleText, limitText);
        if (!parsed) {
            continue;
        }

        const kind = classifyRuleKind(parsed.tokens, countries);
        const firstToken = parsed.tokens[0]?.trim().toLowerCase() ?? "";

        if (kind === "special" && firstToken === "shipamount") {
            shipAmount = parsed.limit;
            continue;
        }

        rules.push({
            id: `rule-${rules.length + 1}`,
            kind,
            targets: parsed.tokens,
            limit: parsed.limit,
            raw: parsed.raw,
        });
    }

    return {
        shipAmount,
        rules,
    };
}

async function loadVersion(spreadSheet: GoogleSpreadsheetService): Promise<string> {
    const versionSheet = await spreadSheet.getSheet("version");
    if (!versionSheet) {
        return "";
    }
    await versionSheet.loadCells("A1:A1");
    return toCellText(versionSheet.getCell(0, 0).value);
}

export async function GET() {
    try {
        const sheetId = process.env.SHIP_AND_RULES_SHEET_ID;
        if (!sheetId) {
            return NextResponse.json({ message: "SHIP_AND_RULES_SHEET_ID is not configured." }, { status: 500 });
        }

        const spreadSheet = new GoogleSpreadsheetService(sheetId);
        await spreadSheet.getSheetNames();

        const version = await loadVersion(spreadSheet);
        const countries = await loadCountryList(spreadSheet);
        const ships = await loadShips(spreadSheet);
        const rules = await loadRules(spreadSheet, countries);

        return NextResponse.json({
            version,
            countries,
            ships,
            rules,
            fetchedAt: new Date().toISOString(),
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "unknown error";
        console.error("Failed to load shipchecker data", error);
        return NextResponse.json(
            { message: `Failed to load shipchecker data. ${message}` },
            { status: 500 },
        );
    }
}
