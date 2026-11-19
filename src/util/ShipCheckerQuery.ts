import type { SelectedShipEntry, ShipData } from "@/util/ShipCheckRules";

export const MAX_URL_SHIPS = 30;
const MAX_URL_RADAR_TOKENS = 100;

export interface SearchParamsLike {
    getAll(name: string): string[];
}

export interface ParsedShipCheckerQuery {
    entries: SelectedShipEntry[];
    unknownShips: string[];
    unknownRadarShips: string[];
    truncatedCount: number;
}

/**
 * 全角・半角の統一（NFKC）、前後空白トリム、連続空白の半角スペース1つへの圧縮、小文字化を行う。
 */
export function normalizeName(value: string): string {
    return value
        .normalize("NFKC")
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase();
}

/**
 * アクセント記号（ダイアクリティカルマーク: Kléber -> kleber, Gdańsk -> gdansk）および
 * 非分解ラテン文字（Preußen -> preussen, Błyskawica -> blyskawica 等）を正規化した文字列を返す。
 */
export function stripDiacritics(value: string): string {
    return normalizeName(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/ß/g, "ss")
        .replace(/ł/g, "l")
        .replace(/ø/g, "o");
}

export function parseCommaSeparatedValues(rawValues: string[]): string[] {
    return rawValues
        .flatMap((value) => value.split(","))
        .map((token) => token.trim())
        .filter(Boolean);
}

/**
 * 艦名を大文字小文字・全半角・連続空白・アクセント記号の揺れを吸収して完全一致で解決する。
 * 優先順位:
 *   1. displayName 正規化一致
 *   2. aliases 正規化一致
 *   3. displayName アクセント記号除去一致
 *   4. aliases アクセント記号除去一致
 * （model は別艦艇誤爆防止のため対象外）
 */
export function resolveShipByName(queryName: string, ships: ShipData[]): ShipData | null {
    const normalized = normalizeName(queryName);
    if (!normalized) {
        return null;
    }

    const displayMatch = ships.find((ship) => normalizeName(ship.displayName) === normalized);
    if (displayMatch) {
        return displayMatch;
    }

    const aliasMatch = ships.find((ship) =>
        ship.aliases.some((alias) => normalizeName(alias) === normalized),
    );
    if (aliasMatch) {
        return aliasMatch;
    }

    const strippedQuery = stripDiacritics(queryName);
    if (!strippedQuery) {
        return null;
    }

    const strippedDisplayMatch = ships.find((ship) => stripDiacritics(ship.displayName) === strippedQuery);
    if (strippedDisplayMatch) {
        return strippedDisplayMatch;
    }

    const strippedAliasMatch = ships.find((ship) =>
        ship.aliases.some((alias) => stripDiacritics(alias) === strippedQuery),
    );
    return strippedAliasMatch ?? null;
}

/**
 * URL クエリパラメータ（ships / radar）から艦艇チェッカーの初期選択状態を復元する。
 */
export function parseInitialSelectionFromParams(
    searchParams: SearchParamsLike,
    ships: ShipData[],
): ParsedShipCheckerQuery {
    const allShipNames = parseCommaSeparatedValues(searchParams.getAll("ships"));
    const radarNames = parseCommaSeparatedValues(searchParams.getAll("radar")).slice(0, MAX_URL_RADAR_TOKENS);
    if (allShipNames.length === 0 && radarNames.length === 0) {
        return {
            entries: [],
            unknownShips: [],
            unknownRadarShips: [],
            truncatedCount: 0,
        };
    }

    const truncatedCount = Math.max(0, allShipNames.length - MAX_URL_SHIPS);
    const targetShipNames = allShipNames.slice(0, MAX_URL_SHIPS);

    const resolvedShips: { rawName: string; ship: ShipData | null }[] = targetShipNames.map((shipName) => ({
        rawName: shipName,
        ship: resolveShipByName(shipName, ships),
    }));

    const selectedShipIds = new Set<string>(
        resolvedShips.map((item) => item.ship?.id).filter((id): id is string => Boolean(id)),
    );

    const radarCountByShipId = new Map<string, number>();
    const unknownRadarShips: string[] = [];

    for (const radarName of radarNames) {
        const matchedShip = resolveShipByName(radarName, ships);
        if (!matchedShip || !selectedShipIds.has(matchedShip.id)) {
            if (!unknownRadarShips.includes(radarName)) {
                unknownRadarShips.push(radarName);
            }
            continue;
        }
        radarCountByShipId.set(matchedShip.id, (radarCountByShipId.get(matchedShip.id) ?? 0) + 1);
    }

    const entries: SelectedShipEntry[] = [];
    const unknownShips: string[] = [];

    for (const { rawName, ship: matchedShip } of resolvedShips) {
        if (!matchedShip) {
            if (!unknownShips.includes(rawName)) {
                unknownShips.push(rawName);
            }
            continue;
        }

        let useOptionalRadar = false;
        if (matchedShip.hasRadar === "Optional") {
            const remaining = radarCountByShipId.get(matchedShip.id) ?? 0;
            if (remaining > 0) {
                useOptionalRadar = true;
                radarCountByShipId.set(matchedShip.id, remaining - 1);
            }
        }

        entries.push({
            ship: matchedShip,
            useOptionalRadar,
        });
    }

    return {
        entries,
        unknownShips,
        unknownRadarShips,
        truncatedCount,
    };
}
