import { postWithProgress } from "@/util/postWithProgress";

export interface registerType {
    teamName?: string;
    teamNickname?: string;
    password?: string;
    passwordConfirm?: string;
    teamLogo?: FileList | File | null;
    contact?: string;
    player1?: string;
    player2?: string;
    player3?: string;
    player4?: string;
    player5?: string;
    player6?: string;
    player7?: string;
    player8?: string;
    player9?: string;
    player10?: string;
    comment?: string;
}

// 送信ボタンの動作
export const onSubmit = async (
    formData: registerType,
    onProgress?: (step: string, progress: number) => void
) => {
    let logo;
    if (formData.teamLogo instanceof FileList) {
        logo = formData.teamLogo[0];
    } else if (formData.teamLogo instanceof File) {
        logo = formData.teamLogo;
    }

    const sendData = new FormData();
    sendData.append("teamName", formData.teamName ?? "");
    sendData.append("teamNickname", formData.teamNickname ?? "");
    sendData.append("password", formData.password ?? "");
    sendData.append("teamLogo", logo ?? new Blob());
    sendData.append("contact", formData.contact ?? "");
    sendData.append("player1", formData.player1 ?? "");
    sendData.append("player2", formData.player2 ?? "");
    sendData.append("player3", formData.player3 ?? "");
    sendData.append("player4", formData.player4 ?? "");
    sendData.append("player5", formData.player5 ?? "");
    sendData.append("player6", formData.player6 ?? "");
    sendData.append("player7", formData.player7 ?? "");
    sendData.append("player8", formData.player8 ?? "");
    sendData.append("player9", formData.player9 ?? "");
    sendData.append("player10", formData.player10 ?? "");
    sendData.append("comment", formData.comment ?? "");

    return await postWithProgress(
        `/api/register`,
        sendData,
        onProgress,
        "登録に失敗しました"
    );
};

export const useRegisterForm = () => {
    return {
        onSubmit
    };
};
