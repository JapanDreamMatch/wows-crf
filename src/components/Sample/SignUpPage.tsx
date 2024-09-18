"use client";

import yup, {object, string} from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
import {Button, FormControl, FormErrorMessage, FormLabel, Input} from "@chakra-ui/react";

//yupスキーマ
const schema2 = object({
    username: string()
        .required("入力してください2")
})
type exampleFormData = yup.InferType<typeof schema2>;

export default function SignUpPage(){

    //React-hook-form
    const {
        register,
        handleSubmit,
        formState: {errors, isSubmitting}
    } = useForm<exampleFormData>({
        resolver: yupResolver(schema2), // Yupと紐付け
        mode: "onChange", // onChange, onBlur, onSubmit, onTouched, allが選択可能
    });

   async function onSubmit(){
        return;
    }

    return (
        <>
            <h1>テストフォーム</h1>
            <form onSubmit={handleSubmit(onSubmit)}>
                <FormControl isInvalid={!!errors.username}>
                    <FormLabel>ユーザーネーム</FormLabel>
                    <Input
                        id="name"
                        placeholder="please input your username"
                        {...register("username")}
                    />
                    <FormErrorMessage>
                        {errors.username && errors.username.message}
                    </FormErrorMessage>
                </FormControl>
                <Button>送信</Button>
            </form>
        </>
    );

};