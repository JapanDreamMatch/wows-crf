import yup, {object, string} from "yup";
import axios from "axios";

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
export async function onSubmit(formData: registerType){

    const res = await axios.post(`${process.env.NEXT_PUBLIC_PAGE_URL}/register`, {
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

    return;
}

//テスト
export async function testSubmit(){
    console.log("sendTo: " + `${process.env.NEXT_PUBLIC_PAGE_URL}/api/register`);
    const resTest = await axios.post(`${process.env.NEXT_PUBLIC_PAGE_URL}/api/register`, {
        teamName:"teamName",
        teamNickName: "teamNickname",
        teamLogo: undefined,
        contact: "Sea#1234",
        ign1: "Seaoftrees08",
        ign2: "p_usuke",
        ign3: "HAATKA",
        ign4: "ZUIHO_Aoi",
        ign5: "Crambom",
        ign6: "",
        ign7: "",
        ign8: "",
        ign9: "",
        ign10: "",
        comment: "NoComment"
    });

}

//アカウントIDの取得
export async function getAccountID(username: string) {
    const response = await axios.post(`${process.env.NEXT_PUBLIC_PAGE_URL}/api/getAccountID`, {username});
    return response.data.message as string;
}
