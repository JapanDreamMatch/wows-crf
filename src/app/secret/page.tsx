"use client"
import {FormEvent, useState} from "react";

export default function Home() {
    const [secret, setSecret] = useState('');
    const [secret2, setSecret2] = useState('');
    const [neko, setNeko] = useState('');

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
            setSecret2(data.test2);
            setNeko(data.neko)
        } catch (error) {
            console.error('Error:', error);
        }
    };

    return (
        <div>
            <p>NEXT_PUBLIC_TEST_SECRET: {process.env.NEXT_PUBLIC_TEST_SECRET ?? "値が設定されていません"}</p>
            <form onSubmit={handleSubmit}>
                <button type="submit">Secretテスト送信</button>
            </form>
            <p>Secret: {secret}</p>
            <p>Secret2: {secret2}</p>
            <p>Neko: {neko}</p>
        </div>
    );
}