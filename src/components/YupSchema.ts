import yup, {object, string} from "yup";

export const registerSchema = object({
    teamname: string()
        .required("チーム名は空にはできません"),
    nickname: string()
        .required("チーム略名は空にはできません"),
    contact: string()
        .required("代表者連絡先を入力してください"),
    ign: string()
        .required("ゲーム内のプレイヤー名を入力してください")
        .matches(/[\w]+?/, { message: '有効なプレイヤー名を入力してください' }),
    other: string()
})
export type registerType = yup.InferType<typeof registerSchema>;