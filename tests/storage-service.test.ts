import { describe, expect, it } from "vitest";
import { extractObjectNameFromUrl } from "@/util/StorageService";

describe("StorageService (extractObjectNameFromUrl)", () => {
    it("extracts objectName only for matching https://storage.googleapis.com/<bucket>/ URLs", () => {
        expect(
            extractObjectNameFromUrl(
                "https://storage.googleapis.com/jdm-team-icon/logos/JDM.png?v=123",
                "jdm-team-icon",
            ),
        ).toBe("logos/JDM.png");
    });

    it("rejects other domains, http scheme, mismatched buckets, and path traversal", () => {
        expect(
            extractObjectNameFromUrl("http://storage.googleapis.com/jdm-team-icon/logos/JDM.png", "jdm-team-icon"),
        ).toBeNull();
        expect(
            extractObjectNameFromUrl("https://evil.example.com/jdm-team-icon/logos/JDM.png", "jdm-team-icon"),
        ).toBeNull();
        expect(
            extractObjectNameFromUrl("https://storage.googleapis.com/other-bucket/logos/JDM.png", "jdm-team-icon"),
        ).toBeNull();
        expect(
            extractObjectNameFromUrl("https://storage.googleapis.com/jdm-team-icon/logos/%2e%2e/secret.png", "jdm-team-icon"),
        ).toBeNull();
    });
});
