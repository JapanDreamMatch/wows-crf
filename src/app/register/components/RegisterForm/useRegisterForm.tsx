import {object, string} from "yup";
import * as yup from "yup"
import axios from "axios";
import {SubmitHandler} from "react-hook-form";

export const registerSchema = object({
    teamName: string(),
    teamNickname: string(),
    teamLogo: yup
        .mixed<File>()
        .test("fileSize", "ファイルサイズが大きすぎます", (value) => {
            return value && value.size <= 2 * 1024 * 1024; // 2MB制限
        })
    ,
    contact: string(),
    player1: string(),
    player2: string(),
    player3: string(),
    player4: string(),
    player5: string(),
    player6: string(),
    player7: string(),
    player8: string(),
    player9: string(),
    player10: string(),
    comment: string()
})
export type registerType = yup.InferType<typeof registerSchema>;

//送信ボタンの動作
export const onSubmit: SubmitHandler<registerType> = async (formData) => {

    let logo;
    if(formData.teamLogo instanceof FileList){
        logo = formData.teamLogo[0];
    } else if(formData.teamLogo instanceof File){
        logo = formData.teamLogo;
    }

    const sendData = new FormData();
    sendData.append("teamName", formData.teamName ?? "");
    sendData.append("teamNickname", formData.teamNickname ?? "");
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
    try {
        const res = await axios.post(`/api/register`, sendData,{
            headers: { "Content-Type": "multipart/form-data" },
        });
        return res.data.message as string;
    } catch (error: any) {
        // エラーメッセージをthrow
        throw new Error(error?.response?.data?.message || "登録に失敗しました");
    }
}

export const useRegisterForm = () => {
    return {
        onSubmit
    }
}
