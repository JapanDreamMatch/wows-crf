"use client";

import axios from "axios";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
    SHIP_TYPES,
    SHIP_TYPE_LABELS,
    evaluateShipRules,
    getAddAvailability,
    type RuleCounter,
    type SelectedShipEntry,
    type ShipData,
    type ShipRule,
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

const SHIP_TYPE_ICON_PATHS: Record<ShipType, string> = {
    dd: "/dd.png",
    cr: "/cr.png",
    bb: "/bb.png",
    cv: "/cv.png",
    sb: "/sb.png",
};

const COUNTRY_ICON_PATHS: Record<string, string> = {
    commonwealth: "/commonwealth.png",
    europe: "/europe.png",
    france: "/france.png",
    germany: "/germany.png",
    italy: "/italy.png",
    japan: "/japan.png",
    netherlands: "/netherlands.png",
    "pan-america": "/pan-america.png",
    "pan-asia": "/pan-asia.png",
    spain: "/spain.png",
    uk: "/uk.png",
    usa: "/usa.png",
    ussr: "/ussr.png",
};

type DropdownOption = {
    value: string;
    label: string;
    icon?: ReactNode;
};

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

function normalizeShipType(type: string): ShipType | null {
    const normalized = type.trim().toLowerCase();
    if (SHIP_TYPES.includes(normalized as ShipType)) {
        return normalized as ShipType;
    }
    return null;
}

function normalizeCountryForIcon(country: string): string {
    return country
        .trim()
        .toLowerCase()
        .replace(/[_.\s]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function getCountryIconPath(country: string): string | null {
    const normalized = normalizeCountryForIcon(country);
    if (normalized === "u-k") {
        return COUNTRY_ICON_PATHS.uk;
    }
    if (normalized === "panamerica") {
        return COUNTRY_ICON_PATHS["pan-america"];
    }
    if (normalized === "panasia") {
        return COUNTRY_ICON_PATHS["pan-asia"];
    }
    return COUNTRY_ICON_PATHS[normalized] ?? null;
}

function ShipTypeIcon({ type }: { type: ShipType }) {
    return <Image src={SHIP_TYPE_ICON_PATHS[type]} alt="" width={14} height={14} className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
}

function CountryFlagIcon({ country }: { country: string }) {
    const iconPath = getCountryIconPath(country);

    if (!iconPath) {
        return null;
    }

    return <Image src={iconPath} alt="" width={18} height={14} className="h-3.5 w-[18px] shrink-0" aria-hidden="true" />;
}

function RuleTargetShipType({ target }: { target: string }) {
    const normalized = normalizeShipType(target);
    if (!normalized) {
        return <span>{target}</span>;
    }

    return (
        <span className="inline-flex items-center gap-1">
            <ShipTypeIcon type={normalized} />
            <span>{shipTypeFilterLabel(normalized)}</span>
        </span>
    );
}

function RuleTargetCountry({ target }: { target: string }) {
    return (
        <span className="inline-flex items-center gap-1">
            <CountryFlagIcon country={target} />
            <span>{target}</span>
        </span>
    );
}

function RuleCounterLabel({ counter, rule }: { counter: RuleCounter; rule?: ShipRule }) {
    if (!rule || (rule.kind !== "country" && rule.kind !== "type")) {
        return <>{counter.label}</>;
    }

    const heading = rule.kind === "country" ? "Countries" : "Ship types";

    return (
        <>
            {heading} (
            {rule.targets.map((target, index) => (
                <span key={`${counter.id}-${target}-${index}`} className="inline-flex items-center gap-1 align-middle">
                    {index > 0 && <span className="text-slate-400">,</span>}
                    {rule.kind === "country" ? <RuleTargetCountry target={target} /> : <RuleTargetShipType target={target} />}
                </span>
            ))}
            ) &lt;= {counter.limit}
        </>
    );
}

function IconFilterDropdown({
    id,
    label,
    value,
    options,
    onChange,
}: {
    id: string;
    label: string;
    value: string;
    options: DropdownOption[];
    onChange: (value: string) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement | null>(null);

    const selectedOption = options.find((option) => option.value === value) ?? options[0];

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const handleMouseDown = (event: MouseEvent) => {
            const target = event.target;
            if (!rootRef.current || !(target instanceof Node)) {
                return;
            }
            if (!rootRef.current.contains(target)) {
                setIsOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleMouseDown);
        document.addEventListener("keydown", handleEscape);
        return () => {
            document.removeEventListener("mousedown", handleMouseDown);
            document.removeEventListener("keydown", handleEscape);
        };
    }, [isOpen]);

    return (
        <div ref={rootRef} className="relative">
            <label htmlFor={id} className="mb-1 block text-xs text-slate-300">
                {label}
            </label>

            <button
                id={id}
                type="button"
                onClick={() => setIsOpen((previous) => !previous)}
                className="flex w-full items-center justify-between rounded border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <span className="inline-flex items-center gap-2">
                    {selectedOption?.icon}
                    <span>{selectedOption?.label}</span>
                </span>
                <span className={`text-[10px] text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden="true">
                    ▼
                </span>
            </button>

            {isOpen && (
                <ul
                    role="listbox"
                    aria-labelledby={id}
                    className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded border border-slate-600 bg-slate-900 shadow-lg"
                >
                    {options.map((option) => (
                        <li key={option.value}>
                            <button
                                type="button"
                                role="option"
                                aria-selected={option.value === value}
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                className={`flex w-full items-center gap-2 px-2 py-2 text-left text-sm ${
                                    option.value === value
                                        ? "bg-cyan-700/40 text-cyan-100"
                                        : "text-slate-100 hover:bg-slate-700/70"
                                }`}
                            >
                                {option.icon}
                                <span>{option.label}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function ShipTypeBadge({ type }: { type: ShipType }) {
    return (
        <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 ${shipTypeBadgeClass(type)}`}>
            <ShipTypeIcon type={type} />
            <span>{shipTypeFilterLabel(type)}</span>
        </span>
    );
}

function CountryBadge({ country }: { country: string }) {
    return (
        <span className="inline-flex items-center gap-1 rounded bg-slate-700 px-2 py-0.5">
            <CountryFlagIcon country={country} />
            <span>{country}</span>
        </span>
    );
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

    const ruleById = useMemo(() => {
        const map = new Map<string, ShipRule>();
        if (!data) {
            return map;
        }
        for (const rule of data.rules.rules) {
            map.set(rule.id, rule);
        }
        return map;
    }, [data]);

    const shipTypeFilterOptions = useMemo<DropdownOption[]>(
        () => [
            {
                value: ALL_FILTER,
                label: "All",
            },
            ...SHIP_TYPES.map((shipType) => ({
                value: shipType,
                label: shipTypeFilterLabel(shipType),
                icon: <ShipTypeIcon type={shipType} />,
            })),
        ],
        [],
    );

    const countryFilterOptions = useMemo<DropdownOption[]>(() => {
        if (!data) {
            return [
                {
                    value: ALL_FILTER,
                    label: "All",
                },
            ];
        }

        return [
            {
                value: ALL_FILTER,
                label: "All",
            },
            ...data.countries.map((country) => ({
                value: country,
                label: country,
                icon: <CountryFlagIcon country={country} />,
            })),
        ];
    }, [data]);

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
                                                    <ShipTypeBadge type={entry.ship.type} />
                                                    <CountryBadge country={entry.ship.country} />
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
                                            <RuleCounterLabel counter={counter} rule={ruleById.get(counter.id)} />
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
                                <IconFilterDropdown
                                    id="ship-type-filter"
                                    label="Ship type"
                                    value={typeFilter}
                                    options={shipTypeFilterOptions}
                                    onChange={(value) => setTypeFilter((value as ShipType | typeof ALL_FILTER) ?? ALL_FILTER)}
                                />
                            </div>

                            <div>
                                <IconFilterDropdown
                                    id="ship-country-filter"
                                    label="Country"
                                    value={countryFilter}
                                    options={countryFilterOptions}
                                    onChange={(value) => setCountryFilter(value)}
                                />
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
                                                    <ShipTypeBadge type={ship.type} />
                                                    <CountryBadge country={ship.country} />
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
