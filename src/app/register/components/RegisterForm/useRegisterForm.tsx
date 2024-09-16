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
export async function onSubmit(){
    return;
}

//アカウントIDの取得
export async function getAccountID(username: string) {
    const response = await axios.post('http://localhost:3000/api/getAccountID', {username});
    return response.data.message as string;
}

export function setAccountUrl(){

}