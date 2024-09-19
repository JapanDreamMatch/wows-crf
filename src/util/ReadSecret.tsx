import fs from 'fs';

export default function Home() {
    const secretFilePath = '/secrets/Test-Secret';
    try {
        const data = fs.readFileSync(secretFilePath, 'utf8');
        return (
            <>
            </>
        );
    } catch (error) {
        console.error('Error reading secret file:', error);
        return (
            <main className="">
                <p>TEST_SECRET: Error reading secret file</p>
        </main>
    );
    }
}