import { NextResponse } from "next/server";
import { GoogleSpreadsheetService } from "@/util/SpreadSheetService";
import {
    getCachedShipCheckerData,
    type ShipCheckerCacheStatus,
    type ShipCheckerPayload,
} from "@/util/ShipCheckerCache";
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

const SHIPCHECKER_CORS_HEADERS: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Expose-Headers": "X-Cache",
    "Access-Control-Max-Age": "86400",
};

function buildCacheControlHeader(cacheStatus: ShipCheckerCacheStatus, ttlSeconds: number): string {
    if (cacheStatus === "BYPASS" || ttlSeconds <= 0) {
        return "no-store";
    }
    if (cacheStatus === "STALE") {
        return "public, max-age=30";
    }
    return `public, max-age=${ttlSeconds}, stale-while-revalidate=${ttlSeconds}`;
}

function createShipCheckerJsonResponse(
    body: unknown,
    status: number,
    extraHeaders?: Record<string, string>,
) {
    return NextResponse.json(body, {
        status,
        headers: {
            ...SHIPCHECKER_CORS_HEADERS,
            ...extraHeaders,
        },
    });
}

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
    const countrySheet = spreadSheet.getLoadedSheet("country");
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
    const rowsByType = await Promise.all(
        SHIP_TYPES.map(async (type) => ({
            type,
            rows: await spreadSheet.getRows(type),
        })),
    );

    const ships: ShipData[] = [];

    for (const { type, rows } of rowsByType) {
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
    const rulesSheet = spreadSheet.getLoadedSheet("rules");
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
    const versionSheet = spreadSheet.getLoadedSheet("version");
    if (!versionSheet) {
        return "";
    }
    await versionSheet.loadCells("A1:A1");
    return toCellText(versionSheet.getCell(0, 0).value);
}

async function fetchShipCheckerDataFromSheet(sheetId: string): Promise<ShipCheckerPayload> {
    const spreadSheet = new GoogleSpreadsheetService(sheetId);
    await spreadSheet.loadInfo();

    const [version, countries, ships] = await Promise.all([
        loadVersion(spreadSheet),
        loadCountryList(spreadSheet),
        loadShips(spreadSheet),
    ]);
    const rules = await loadRules(spreadSheet, countries);

    return {
        version,
        countries,
        ships,
        rules,
        fetchedAt: new Date().toISOString(),
    };
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: SHIPCHECKER_CORS_HEADERS,
    });
}

export async function GET() {
    try {
        const sheetId = process.env.SHIP_AND_RULES_SHEET_ID;
        if (!sheetId) {
            console.error("SHIP_AND_RULES_SHEET_ID is not configured.");
            return createShipCheckerJsonResponse(
                { message: "Shipchecker service is not configured." },
                500,
                { "Cache-Control": "no-store" },
            );
        }

        const result = await getCachedShipCheckerData(() => fetchShipCheckerDataFromSheet(sheetId));

        return createShipCheckerJsonResponse(result.data, 200, {
            "Cache-Control": buildCacheControlHeader(result.cacheStatus, result.ttlSeconds),
            "X-Cache": result.cacheStatus,
        });
    } catch (error: unknown) {
        console.error("Failed to load shipchecker data", error);
        return createShipCheckerJsonResponse(
            { message: "Failed to load shipchecker data." },
            500,
            { "Cache-Control": "no-store" },
        );
    }
}
