import { getCachedAppSettings, getCachedRegisterSheetNames } from "@/util/AppSettingsCache";

export async function CheckTeamAmount(): Promise<boolean> {
    const [settings, sheetNames] = await Promise.all([
        getCachedAppSettings(),
        getCachedRegisterSheetNames(),
    ]);

    const validSheetNames = sheetNames.filter((name) => !name.includes("@"));
    return Boolean(validSheetNames.length < settings.maxTeamAmount);
}
