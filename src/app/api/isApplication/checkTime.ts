import { getCachedAppSettings } from "@/util/AppSettingsCache";

export async function CheckTime(): Promise<boolean> {
    const settings = await getCachedAppSettings();
    if (!settings.startDate || !settings.endDate) {
        return false;
    }

    const now = new Date();
    const startDate = new Date(settings.startDate);
    const endDate = new Date(settings.endDate);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return false;
    }

    return startDate <= now && now <= endDate;
}
