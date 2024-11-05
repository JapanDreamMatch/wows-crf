"use client";
import axios from "axios";
import {useEffect, useState} from "react";

export function JdmDiscordLink(){

    const [discordLink, setDiscordLink] = useState("#");
    useEffect( () => {
        axios.post("/api/discordlink", {}).then(res => setDiscordLink(res.data.link));
    })

    return (
        <a href={discordLink} className="hover:underline text-blue-400" target="_blank">
            JDM 運営Discord
        </a>
    )
}