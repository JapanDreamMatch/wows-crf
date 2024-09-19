/** @type {import('next').NextConfig} */
const nextConfig = {
    env: {
        WOWS_API_APP_ID: process.env.WOWS_API_APP_ID,
        NEXT_PUBLIC_PAGE_URL: process.env.NEXT_PUBLIC_PAGE_URL,
        DISCORD_LINK: process.env.DISCORD_LINK,
        REGISTER_SHEET_ID: process.env.REGISTER_SHEET_ID,
        GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY,
        TEST_SECRET: process.env.TEST_SECRET,
    },
};

export default nextConfig;
