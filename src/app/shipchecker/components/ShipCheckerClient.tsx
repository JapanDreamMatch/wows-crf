"use client";

import axios from "axios";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
    SHIP_TYPES,
    SHIP_TYPE_LABELS,
    evaluateShipRules,
    getAddAvailability,
    type SelectedShipEntry,
    type ShipData,
    type ShipRuleSet,
    type ShipType,
} from "@/util/ShipCheckRules";

type ShipCheckerApiResponse = {
    countries: string[];
    ships: ShipData[];
    rules: ShipRuleSet;
};

type ShipCheckerErrorResponse = {
    message?: string;
};

const ALL_FILTER = "all";

function normalizeText(value: string): string {
    return value.trim().toLowerCase();
}

function getShipSearchText(ship: ShipData): string {
    return [ship.displayName, ship.rawName, ...ship.aliases, ship.model].filter(Boolean).join(" ").toLowerCase();
}

function shipTypeFilterLabel(type: ShipType): string {
    return SHIP_TYPE_LABELS[type];
}

function shipTypeBadgeClass(type: ShipType): string {
    if (type === "dd") {
        return "bg-sky-700/70 text-sky-100";
    }
    if (type === "cr") {
        return "bg-teal-700/70 text-teal-100";
    }
    if (type === "bb") {
        return "bg-amber-700/70 text-amber-100";
    }
    if (type === "cv") {
        return "bg-rose-700/70 text-rose-100";
    }
    return "bg-violet-700/70 text-violet-100";
}

export default function ShipCheckerClient() {
    const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
    const [errorMessage, setErrorMessage] = useState<string>("");
    const [data, setData] = useState<ShipCheckerApiResponse | null>(null);

    const [nameFilter, setNameFilter] = useState<string>("");
    const [typeFilter, setTypeFilter] = useState<ShipType | typeof ALL_FILTER>(ALL_FILTER);
    const [countryFilter, setCountryFilter] = useState<string>(ALL_FILTER);

    const [selectedEntries, setSelectedEntries] = useState<SelectedShipEntry[]>([]);

    useEffect(() => {
        let isMounted = true;

        (async () => {
            try {
                const response = await axios.get<ShipCheckerApiResponse>("/api/shipchecker");
                if (!isMounted) {
                    return;
                }
                setData(response.data);
                setStatus("ready");
            } catch (error: unknown) {
                console.error(error);
                if (!isMounted) {
                    return;
                }

                if (axios.isAxiosError<ShipCheckerErrorResponse>(error)) {
                    setErrorMessage(error.response?.data?.message || "Failed to load ship list from spreadsheet.");
                } else {
                    setErrorMessage("Failed to load ship list from spreadsheet.");
                }
                setStatus("error");
            }
        })();

        return () => {
            isMounted = false;
        };
    }, []);

    const selectedCountByShipId = useMemo(() => {
        const map = new Map<string, number>();
        for (const entry of selectedEntries) {
            const previous = map.get(entry.ship.id) ?? 0;
            map.set(entry.ship.id, previous + 1);
        }
        return map;
    }, [selectedEntries]);

    const filteredShips = useMemo(() => {
        if (!data) {
            return [];
        }

        const normalizedNameFilter = normalizeText(nameFilter);

        return data.ships.filter((ship) => {
            if (typeFilter !== ALL_FILTER && ship.type !== typeFilter) {
                return false;
            }

            if (countryFilter !== ALL_FILTER && ship.country !== countryFilter) {
                return false;
            }

            if (normalizedNameFilter) {
                return getShipSearchText(ship).includes(normalizedNameFilter);
            }

            return true;
        });
    }, [countryFilter, data, nameFilter, typeFilter]);

    const evaluation = useMemo(() => {
        if (!data) {
            return null;
        }
        return evaluateShipRules(selectedEntries, data.rules);
    }, [data, selectedEntries]);

    const addAvailabilityMap = useMemo(() => {
        const map = new Map<string, ReturnType<typeof getAddAvailability>>();
        if (!data) {
            return map;
        }

        for (const ship of filteredShips) {
            map.set(ship.id, getAddAvailability(selectedEntries, ship, data.rules));
        }

        return map;
    }, [data, filteredShips, selectedEntries]);

    const handleAddShip = (ship: ShipData) => {
        if (!data) {
            return;
        }

        const addAvailability = getAddAvailability(selectedEntries, ship, data.rules);
        if (!addAvailability.allowed) {
            return;
        }

        setSelectedEntries((prev) => [
            ...prev,
            {
                ship,
                useOptionalRadar: false,
            },
        ]);
    };

    const handleRemoveShip = (index: number) => {
        setSelectedEntries((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
    };

    const handleToggleOptionalRadar = (index: number, checked: boolean) => {
        setSelectedEntries((prev) =>
            prev.map((entry, currentIndex) => {
                if (currentIndex !== index) {
                    return entry;
                }
                return {
                    ...entry,
                    useOptionalRadar: checked,
                };
            }),
        );
    };

    if (status === "loading") {
        return (
            <main className="min-h-screen bg-gray-800 px-4 py-6 text-slate-100">
                <div className="mx-auto max-w-5xl rounded-lg border border-slate-700 bg-slate-900/40 p-6">
                    Loading shipchecker data...
                </div>
            </main>
        );
    }

    if (status === "error" || !data) {
        return (
            <main className="min-h-screen bg-gray-800 px-4 py-6 text-slate-100">
                <div className="mx-auto max-w-5xl rounded-lg border border-rose-700 bg-rose-900/20 p-6">
                    <p>{errorMessage || "Unexpected error"}</p>
                    <div className="mt-4">
                        <Link href="/" className="rounded bg-slate-700 px-3 py-2 text-sm hover:bg-slate-600">
                            Back to top
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gray-800 px-3 py-4 text-slate-100 md:px-6 md:py-6">
            <div className="mx-auto max-w-7xl space-y-4">
                <header className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
                    <h1 className="text-2xl font-semibold">Ship Checker</h1>
                    <p className="mt-2 text-sm text-slate-300">
                        Left: selected ships. Right: searchable candidates. Selection follows spreadsheet rules.
                    </p>
                </header>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <section className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
                        <h2 className="text-lg font-semibold">Selected ships</h2>
                        <p className="mt-1 text-sm text-slate-300">
                            {selectedEntries.length} / {data.rules.shipAmount}
                        </p>

                        {selectedEntries.length === 0 ? (
                            <p className="mt-4 rounded border border-dashed border-slate-600 p-3 text-sm text-slate-400">
                                No ship selected.
                            </p>
                        ) : (
                            <div className="mt-4 max-h-[58vh] space-y-3 overflow-y-auto pr-1">
                                {selectedEntries.map((entry, index) => (
                                    <article key={`${entry.ship.id}-${index}`} className="rounded border border-slate-600 bg-slate-950/40 p-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="space-y-1">
                                                <p className="text-sm font-semibold">
                                                    Slot {index + 1}: {entry.ship.displayName}
                                                </p>
                                                <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                                                    <span className={`rounded px-2 py-0.5 ${shipTypeBadgeClass(entry.ship.type)}`}>
                                                        {shipTypeFilterLabel(entry.ship.type)}
                                                    </span>
                                                    <span className="rounded bg-slate-700 px-2 py-0.5">{entry.ship.country}</span>
                                                    <span className="rounded bg-slate-700 px-2 py-0.5">
                                                        Tier {entry.ship.tier ?? "-"}
                                                    </span>
                                                    {entry.ship.hasRader !== "No" && (
                                                        <span className="rounded bg-cyan-700/70 px-2 py-0.5 text-cyan-100">
                                                            Radar {entry.ship.hasRader}
                                                        </span>
                                                    )}
                                                    {entry.ship.hasAircraft && (
                                                        <span className="rounded bg-indigo-700/70 px-2 py-0.5 text-indigo-100">
                                                            Aircraft
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => handleRemoveShip(index)}
                                                className="rounded bg-rose-700 px-3 py-1 text-xs font-medium hover:bg-rose-600"
                                            >
                                                Remove
                                            </button>
                                        </div>

                                        {entry.ship.hasRader === "Optional" && (
                                            <label className="mt-3 inline-flex items-center gap-2 text-xs text-slate-300">
                                                <input
                                                    type="checkbox"
                                                    checked={entry.useOptionalRadar}
                                                    onChange={(event) => handleToggleOptionalRadar(index, event.target.checked)}
                                                />
                                                Count this ship as using radar (for allRader rule)
                                            </label>
                                        )}
                                    </article>
                                ))}
                            </div>
                        )}

                        <div className="mt-4 rounded border border-slate-600 bg-slate-950/40 p-3">
                            <h3 className="text-sm font-semibold">Rule check</h3>
                            <div className="mt-2 max-h-56 overflow-y-auto pr-1 text-sm">
                                {evaluation?.counters.map((counter) => (
                                    <div key={counter.id} className="flex items-start justify-between gap-3 py-1">
                                        <span className={counter.isViolation ? "text-rose-300" : "text-slate-300"}>
                                            {counter.label}
                                        </span>
                                        <span
                                            className={`rounded px-2 py-0.5 text-xs ${
                                                counter.isViolation ? "bg-rose-900/60 text-rose-100" : "bg-slate-700 text-slate-200"
                                            }`}
                                        >
                                            {counter.actual}/{counter.limit}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {(evaluation?.violations.length ?? 0) > 0 && (
                                <p className="mt-2 text-xs text-rose-300">
                                    Rule violation detected: {evaluation?.violations.length}
                                </p>
                            )}
                        </div>
                    </section>

                    <section className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
                        <h2 className="text-lg font-semibold">Available ships</h2>

                        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                            <div>
                                <label htmlFor="ship-name-filter" className="mb-1 block text-xs text-slate-300">
                                    Name search
                                </label>
                                <input
                                    id="ship-name-filter"
                                    value={nameFilter}
                                    onChange={(event) => setNameFilter(event.target.value)}
                                    placeholder="e.g. Shimakaze"
                                    className="w-full rounded border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500"
                                />
                            </div>

                            <div>
                                <label htmlFor="ship-type-filter" className="mb-1 block text-xs text-slate-300">
                                    Ship type
                                </label>
                                <select
                                    id="ship-type-filter"
                                    value={typeFilter}
                                    onChange={(event) =>
                                        setTypeFilter((event.target.value as ShipType | typeof ALL_FILTER) ?? ALL_FILTER)
                                    }
                                    className="w-full rounded border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500"
                                >
                                    <option value={ALL_FILTER}>All</option>
                                    {SHIP_TYPES.map((shipType) => (
                                        <option key={shipType} value={shipType}>
                                            {shipTypeFilterLabel(shipType)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="ship-country-filter" className="mb-1 block text-xs text-slate-300">
                                    Country
                                </label>
                                <select
                                    id="ship-country-filter"
                                    value={countryFilter}
                                    onChange={(event) => setCountryFilter(event.target.value)}
                                    className="w-full rounded border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500"
                                >
                                    <option value={ALL_FILTER}>All</option>
                                    {data.countries.map((country) => (
                                        <option key={country} value={country}>
                                            {country}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <p className="mt-3 text-xs text-slate-400">Search result: {filteredShips.length} ships</p>

                        <div className="mt-3 max-h-[70vh] space-y-2 overflow-y-auto pr-1">
                            {filteredShips.map((ship) => {
                                const addAvailability = addAvailabilityMap.get(ship.id) ?? {
                                    allowed: true,
                                    reason: "",
                                };
                                const selectedCount = selectedCountByShipId.get(ship.id) ?? 0;

                                return (
                                    <article key={ship.id} className="rounded border border-slate-600 bg-slate-950/40 p-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="space-y-1">
                                                <p className="text-sm font-semibold">{ship.displayName}</p>
                                                {ship.aliases.length > 1 && (
                                                    <p className="text-xs text-slate-400">Aliases: {ship.aliases.join(" / ")}</p>
                                                )}
                                                {ship.model && (
                                                    <p className="text-xs text-slate-400">Model ship: {ship.model}</p>
                                                )}

                                                <div className="flex flex-wrap gap-2 text-xs text-slate-200">
                                                    <span className={`rounded px-2 py-0.5 ${shipTypeBadgeClass(ship.type)}`}>
                                                        {shipTypeFilterLabel(ship.type)}
                                                    </span>
                                                    <span className="rounded bg-slate-700 px-2 py-0.5">{ship.country}</span>
                                                    <span className="rounded bg-slate-700 px-2 py-0.5">
                                                        Tier {ship.tier ?? "-"}
                                                    </span>
                                                    {ship.hasRader !== "No" && (
                                                        <span className="rounded bg-cyan-700/70 px-2 py-0.5 text-cyan-100">
                                                            Radar {ship.hasRader}
                                                        </span>
                                                    )}
                                                    {ship.hasAircraft && (
                                                        <span className="rounded bg-indigo-700/70 px-2 py-0.5 text-indigo-100">
                                                            Aircraft
                                                        </span>
                                                    )}
                                                    {ship.isBan && (
                                                        <span className="rounded bg-rose-700/70 px-2 py-0.5 text-rose-100">
                                                            Sheet BAN
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                {selectedCount > 0 && (
                                                    <p className="mb-1 text-xs text-cyan-300">Selected: {selectedCount}</p>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => handleAddShip(ship)}
                                                    disabled={!addAvailability.allowed}
                                                    className={`rounded px-3 py-1 text-xs font-medium ${
                                                        addAvailability.allowed
                                                            ? "bg-cyan-700 hover:bg-cyan-600"
                                                            : "cursor-not-allowed bg-slate-600 text-slate-300"
                                                    }`}
                                                >
                                                    Add
                                                </button>
                                                {!addAvailability.allowed && addAvailability.reason && (
                                                    <p className="mt-1 max-w-44 text-xs text-rose-300">{addAvailability.reason}</p>
                                                )}
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}
