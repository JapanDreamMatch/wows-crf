"use client";
import axios from "axios";
import { useEffect, useState } from "react";
import { isSafeDiscordInviteUrl } from "@/util/UrlValidator";

export function JdmDiscordLink() {
    const [discordLink, setDiscordLink] = useState("#");

    useEffect(() => {
        let isMounted = true;
        // これは公開してもいいやつ
        const docURL =
            "https://docs.google.com/document/d/1XY0N20Y1CZgTxq6b_4D0bJAe8X8ba_UMwt_RVy-bHBY/edit?usp=sharing";

        async function fetchContent() {
            const viewURL = docURL.replace("/edit?usp=sharing", "/export?format=txt");

            try {
                const response = await axios.get<string>(viewURL, { timeout: 10_000 });
                const candidate = typeof response.data === "string" ? response.data.trim() : "";
                if (!isMounted) return;
                if (isSafeDiscordInviteUrl(candidate)) {
                    setDiscordLink(candidate);
                } else {
                    setDiscordLink("Failed to load content.");
                }
            } catch (error) {
                console.error("Error fetching document:", error);
                if (isMounted) {
                    setDiscordLink("Failed to load content.");
                }
            }
        }

        void fetchContent();
        return () => {
            isMounted = false;
        };
    }, []);

    if (discordLink === "#") {
        return (
            <span className="hover:underline text-blue-600 dark:text-blue-400"> DiscordLink取得中... </span>
        );
    }
    if (discordLink === "Failed to load content.") {
        return (
            <span className="hover:underline text-blue-600 dark:text-blue-400"> DiscordLinkの取得に失敗 </span>
        );
    }
    return (
        <a
            href={discordLink}
            className="hover:underline text-blue-600 dark:text-blue-400"
            target="_blank"
            rel="noopener noreferrer"
        >
            JDM 運営Discord
        </a>
    );
}
