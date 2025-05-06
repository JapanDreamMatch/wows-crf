"use client";
import axios from "axios";
import {useEffect, useState} from "react";

export function JdmDiscordLink(){

    const [discordLink, setDiscordLink] = useState("#");
    useEffect(() => {
        //これは公開してもいいやつ
        const docURL = "https://docs.google.com/document/d/1XY0N20Y1CZgTxq6b_4D0bJAe8X8ba_UMwt_RVy-bHBY/edit?usp=sharing"

        async function fetchContent() {
            const viewURL = docURL.replace("/edit?usp=sharing", "/export?format=txt");

            try {
                const response = await axios.get(viewURL);
                setDiscordLink(response.data || "No content available");
            } catch (error) {
                console.error("Error fetching document:", error);
                setDiscordLink("Failed to load content.");
            }
        }

        void fetchContent();
    });

    if(discordLink === "#") {
        return (
            <span className="hover:underline text-blue-400"> DiscordLink取得中... </span>
        )
    }else if(discordLink === "Failed to load content.") {
        return (
            <span className="hover:underline text-blue-400"> DiscordLinkの取得に失敗 </span>
        )
    }else{
        return (
            <a href={discordLink} className="hover:underline text-blue-400" target="_blank">
                JDM 運営Discord
            </a>
        )
    }

}