import { useState, ChangeEvent, FormEvent } from 'react';
import axios from 'axios';

export default function APITester() {
    const [username, setUsername] = useState<string>('');
    const [response, setResponse] = useState<string>('');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        try {
            const res = await axios.post('http://localhost:3000/api/ign', { username });
            setResponse(res.data.message);
            console.log("↓in APITester res.data.message↓")
            console.log(res.data.message);
        } catch (error) {
            console.error('Error submitting form', error);
        }
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        setUsername(e.target.value);
    };

    return (
        <div>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={username}
                    onChange={handleChange}
                    placeholder="Enter username"
                />
                <button type="submit">Submit</button>
            </form>
            {response && <p>Response: {response}</p>}
        </div>
    );
}