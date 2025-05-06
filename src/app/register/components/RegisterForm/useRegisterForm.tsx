import {object, string} from "yup";
import * as yup from "yup";
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
        // .test("fileType", "jpeg, png画像ファイルのみ許可されます", (value) => {
        //     return value && ["image/jpeg", "image/png"].includes(value.type);
        // })
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

    const formDataObj = new FormData();

    //テキストデータの追加
    formDataObj.append("teamName", String(formData.teamName));
    formDataObj.append("teamNickname", String(formData.teamNickname));
    formDataObj.append("contact", String(formData.contact));
    formDataObj.append("player1", String(formData.player1));
    formDataObj.append("player2", String(formData.player2));
    formDataObj.append("player3", String(formData.player3));
    formDataObj.append("player4", String(formData.player4));
    formDataObj.append("player5", String(formData.player5));
    formDataObj.append("player6", String(formData.player6));
    formDataObj.append("player7", String(formData.player7));
    formDataObj.append("player8", String(formData.player8));
    formDataObj.append("player9", String(formData.player9));
    formDataObj.append("player10", String(formData.player10));
    formDataObj.append("comment", String(formData.comment));


    // ファイルが存在する場合のみ追加
    if (formData.teamLogo) {
        formDataObj.append("teamLogo", formData.teamLogo);
    }

    const res = await axios.post(`/api/register`, formDataObj, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });


    // const res = await axios.post(`/api/register`, {
    //     teamName: formData.teamName,
    //     teamNickName: formData.teamNickname,
    //     teamLogo: formData.teamLogo ?? undefined,
    //     contact: formData.contact,
    //     ign1: formData.player1 ?? "",
    //     ign2: formData.player2 ?? "",
    //     ign3: formData.player3 ?? "",
    //     ign4: formData.player4 ?? "",
    //     ign5: formData.player5 ?? "",
    //     ign6: formData.player6 ?? "",
    //     ign7: formData.player7 ?? "",
    //     ign8: formData.player8 ?? "",
    //     ign9: formData.player9 ?? "",
    //     ign10: formData.player10 ?? "",
    //     comment: formData.comment ?? ""
    // });

    return res.data.message as string;
}

export const useRegisterForm = () => {
    return {
        onSubmit
    }
}
