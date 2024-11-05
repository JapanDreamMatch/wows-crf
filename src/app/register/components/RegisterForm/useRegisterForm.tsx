import yup, {object, string} from "yup";
import axios from "axios";
import {SubmitHandler} from "react-hook-form";

export const registerSchema = object({
    teamName: string(),
    teamNickname: string(),
    teamLogo: object(),
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
    const res = await axios.post(`/api/register`, {
        teamName: formData.teamName,
        teamNickName: formData.teamNickname,
        teamLogo: formData.teamLogo ?? undefined,
        contact: formData.contact,
        ign1: formData.player1 ?? "",
        ign2: formData.player2 ?? "",
        ign3: formData.player3 ?? "",
        ign4: formData.player4 ?? "",
        ign5: formData.player5 ?? "",
        ign6: formData.player6 ?? "",
        ign7: formData.player7 ?? "",
        ign8: formData.player8 ?? "",
        ign9: formData.player9 ?? "",
        ign10: formData.player10 ?? "",
        comment: formData.comment ?? ""
    });

    return res.data.message as string;
}

export const testSubmit: SubmitHandler<registerType> = async (formData) => {
    return new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 1000);
    });
}
