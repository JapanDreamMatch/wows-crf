export async function postWithProgress(
    url: string,
    formData: FormData,
    onProgress?: (step: string, progress: number) => void,
    defaultErrorMsg = "処理に失敗しました"
): Promise<string> {
    const res = await fetch(url, {
        method: "POST",
        headers: {
            Accept: "application/x-ndjson",
        },
        body: formData,
    });

    const contentType = res.headers.get("content-type") ?? "";

    // ストリームでない通常のJSONレスポンスの場合のフォールバック
    if (!contentType.includes("application/x-ndjson")) {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(json?.message || defaultErrorMsg);
        }
        return json?.message ?? "ok";
    }

    if (!res.body) {
        throw new Error(defaultErrorMsg);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let resultMessage = "ok";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            let event: any;
            try {
                event = JSON.parse(trimmed);
            } catch {
                continue;
            }

            if (event.type === "progress") {
                onProgress?.(event.step, event.progress);
            } else if (event.type === "error") {
                throw new Error(event.message || defaultErrorMsg);
            } else if (event.type === "done") {
                resultMessage = event.message ?? "ok";
            }
        }
    }

    return resultMessage;
}

