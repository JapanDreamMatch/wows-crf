"use client"
import {FormEvent, useState} from "react";


export default function Home() {
    const [secret, setSecret] = useState('');

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();

        try {
            const response = await fetch('/api/secret', {
                method: 'POST',
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            setSecret(data.test);
        } catch (error) {
            console.error('Error:', error);
        }
    };

    return (
        <div>
            <p>NEXT_PUBLIC_TEST_SECRET: {process.env.NEXT_PUBLIC_TEST_SECRET ?? "値が設定されていません"}</p>
            <form onSubmit={handleSubmit}>
                <button type="submit">送信</button>
            </form>
            <p>Secret: {secret}</p>
        </div>
    );
}