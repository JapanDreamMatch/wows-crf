import yup, {number, object, string} from "yup";
import axios from "axios";

export const registerSchema = object({
    teamname: string()
        .required("チーム名は空にはできません"),
    nickname: string()
        .required("チーム略名は空にはできません"),
    contact: string()
        .required("代表者連絡先を入力してください"),
    ign: string()
        .required("ゲーム内のプレイヤー名を入力してください")
        .matches(/[\w]+?/, { message: '有効なプレイヤー名を入力してください' })
        .test({
            name: "existIGN",
            message: "プレイヤー名が存在しないか、候補が多すぎます",
            async test(value) {
                const username = value;
                const response = await axios.post('http://localhost:3000/api/ign', {username});
                return (response.data.message[0] as string == value);
            }
        }),
    ign2: string(),
    uid2: number(),
    other: string()
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