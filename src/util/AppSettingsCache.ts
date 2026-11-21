import { GoogleSpreadsheetService } from "@/util/SpreadSheetService";
import { logServerError } from "@/util/SafeLogger";

export interface AppSettingsSnapshot {
    startDate: string | null;
    endDate: string | null;
    isIgnore: boolean;
    maxTeamAmount: number;
    logoDirectory: string;
}

interface TimedCacheSlot<T> {
    data: T | null;
    expiresAt: number;
    staleRetryAt: number;
    coldErrorRetryAt: number;
    inFlight: Promise<T> | null;
}

interface AppCacheStore {
    settings: TimedCacheSlot<AppSettingsSnapshot>;
    sheetNames: TimedCacheSlot<string[]>;
}

const DEFAULT_SETTINGS_TTL_MS = 20_000;
const DEFAULT_SHEET_NAMES_TTL_MS = 10_000;
const STALE_COOLDOWN_MS = 15_000;
const COLD_ERROR_COOLDOWN_MS = 5_000;
const GLOBAL_CACHE_KEY = Symbol.for("wows-crf.appSettings.cacheStore");

function createEmptySlot<T>(): TimedCacheSlot<T> {
    return {
        data: null,
        expiresAt: 0,
        staleRetryAt: 0,
        coldErrorRetryAt: 0,
        inFlight: null,
    };
}

function getCacheStore(): AppCacheStore {
    const g = globalThis as typeof globalThis & { [GLOBAL_CACHE_KEY]?: AppCacheStore };
    if (!g[GLOBAL_CACHE_KEY]) {
        g[GLOBAL_CACHE_KEY] = {
            settings: createEmptySlot<AppSettingsSnapshot>(),
            sheetNames: createEmptySlot<string[]>(),
        };
    }
    return g[GLOBAL_CACHE_KEY];
}

/**
 * TTL・Singleflight・Stale-on-Error・コールドスタート負のキャッシュを備えた汎用キャッシュ読取
 */
export async function readWithResilientCache<T>(
    slot: TimedCacheSlot<T>,
    ttlMs: number,
    fetcher: () => Promise<T>,
    contextLabel: string,
): Promise<T> {
    const now = Date.now();
    if (slot.data !== null && now < slot.expiresAt) {
        return slot.data;
    }
    if (slot.data !== null && now < slot.staleRetryAt) {
        return slot.data;
    }
    if (slot.data === null && now < slot.coldErrorRetryAt) {
        throw new Error(`${contextLabel} temporarily unavailable`);
    }

    if (!slot.inFlight) {
        let promise: Promise<T> | null = null;
        promise = (async () => {
            try {
                const fresh = await fetcher();
                slot.data = fresh;
                slot.expiresAt = Date.now() + ttlMs;
                slot.staleRetryAt = 0;
                slot.coldErrorRetryAt = 0;
                return fresh;
            } catch (error: unknown) {
                if (slot.data !== null) {
                    slot.staleRetryAt = Date.now() + STALE_COOLDOWN_MS;
                    logServerError(`${contextLabel} (serving stale)`, error);
                    return slot.data;
                }
                slot.coldErrorRetryAt = Date.now() + COLD_ERROR_COOLDOWN_MS;
                throw error;
            } finally {
                if (slot.inFlight === promise) {
                    slot.inFlight = null;
                }
            }
        })();
        slot.inFlight = promise;
    }

    return await slot.inFlight;
}

async function fetchAppSettingsFromSheet(): Promise<AppSettingsSnapshot> {
    const { API_SETTINGS_SHEET_ID } = process.env;
    const settingsBook = new GoogleSpreadsheetService(API_SETTINGS_SHEET_ID ?? "");
    // loadInfo() を 1 回に集約してクォータ消費を抑える
    await settingsBook.loadInfo();

    const periodSheet = settingsBook.getLoadedSheet("registerPeriod");
    const maxAmountSheet = settingsBook.getLoadedSheet("maxTeamAmount");
    const logoDirSheet = settingsBook.getLoadedSheet("logo_directory");

    await Promise.all([
        periodSheet?.loadCells({
            startRowIndex: 0,
            endRowIndex: 2,
            startColumnIndex: 0,
            endColumnIndex: 3,
        }),
        maxAmountSheet?.loadCells({
            startRowIndex: 0,
            endRowIndex: 2,
            startColumnIndex: 0,
            endColumnIndex: 2,
        }),
        logoDirSheet?.loadCells({
            startRowIndex: 0,
            endRowIndex: 2,
            startColumnIndex: 0,
            endColumnIndex: 1,
        }),
    ]);

    const startDate = periodSheet?.getCell(1, 0).value?.toString() ?? null;
    const endDate = periodSheet?.getCell(1, 1).value?.toString() ?? null;
    const ignoreVal = periodSheet?.getCell(1, 2).value?.toString() ?? "";
    const maxTeamAmount = Number(maxAmountSheet?.getCell(1, 0).value?.toString() ?? "0");
    const logoDirRaw = logoDirSheet?.getCell(1, 0).value?.toString()?.trim();

    return {
        startDate,
        endDate,
        isIgnore: ignoreVal === "YES",
        maxTeamAmount: Number.isFinite(maxTeamAmount) ? maxTeamAmount : 0,
        logoDirectory: logoDirRaw || "logos",
    };
}

async function fetchRegisterSheetNamesFromSheet(): Promise<string[]> {
    const { REGISTER_SHEET_ID } = process.env;
    const spreadSheet = new GoogleSpreadsheetService(REGISTER_SHEET_ID ?? "");
    return await spreadSheet.getSheetNames();
}

export async function getCachedAppSettings(
    fetcher: () => Promise<AppSettingsSnapshot> = fetchAppSettingsFromSheet,
    ttlMs: number = DEFAULT_SETTINGS_TTL_MS,
): Promise<AppSettingsSnapshot> {
    return readWithResilientCache(getCacheStore().settings, ttlMs, fetcher, "AppSettingsCache");
}

export async function getCachedRegisterSheetNames(
    fetcher: () => Promise<string[]> = fetchRegisterSheetNamesFromSheet,
    ttlMs: number = DEFAULT_SHEET_NAMES_TTL_MS,
): Promise<string[]> {
    return readWithResilientCache(getCacheStore().sheetNames, ttlMs, fetcher, "RegisterSheetNamesCache");
}

export function invalidateRegisterSheetNamesCache(): void {
    const slot = getCacheStore().sheetNames;
    slot.data = null;
    slot.expiresAt = 0;
    slot.staleRetryAt = 0;
    slot.coldErrorRetryAt = 0;
}

export function resetAppSettingsCacheForTest(): void {
    const store = getCacheStore();
    store.settings = createEmptySlot<AppSettingsSnapshot>();
    store.sheetNames = createEmptySlot<string[]>();
}
