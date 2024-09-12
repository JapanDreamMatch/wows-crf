import yup, {object, string} from "yup";
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
                return (response.data.message as string == value);
            }
        }),
    other: string()
})
export type registerType = yup.InferType<typeof registerSchema>;