
export function JdmDiscordLink(){

    const { NEXT_PUBLIC_DISCORD_LINK } = process.env;

    return (
        <a href={NEXT_PUBLIC_DISCORD_LINK} className="hover:underline text-blue-400" target="_blank">
            JDM 運営Discord
        </a>
    )
}