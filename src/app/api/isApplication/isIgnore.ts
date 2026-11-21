import { getCachedAppSettings } from "@/util/AppSettingsCache";

export async function IsIgnore(): Promise<boolean> {
    const settings = await getCachedAppSettings();
    return settings.isIgnore;
}
