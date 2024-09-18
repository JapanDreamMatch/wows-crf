export function JdmDiscordLink(){
    return (
        <a href={process.env.DISCORD_LINK} className="hover:underline text-blue-400" target="_blank">
            JDM 運営Discord
        </a>
    )
}