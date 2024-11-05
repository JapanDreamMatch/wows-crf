import RegisterForm from "@/app/register/components/RegisterForm/RegisterForm";
import {Box, Heading} from "@chakra-ui/react";
import {JdmDiscordLink} from "@/components/JdmDiscordLink";

export default function ContestantRegister(){
    return(
        <div className="text-slate-100 bg-gray-800">
            <Box m={4} className="max-w-full">

                {/* フォーム注意事項 */}
                <Box borderWidth='1px' borderRadius='lg' className="max-w-3xl p-2 mx-auto my-4">
                    <Heading
                        size="lg"
                        className="text-center border-b-2 border-slate-400 mt-2 mx-4">
                        フォーム注意事項
                    </Heading>
                    <p className="break-all mx-4 my-2">・このフォームは、出場チーム1つにつき1つ提出となります。</p>
                    <p className="break-all mx-4 my-2">
                        ・提出後の変更は{<JdmDiscordLink/>}の運営ロールの付いた者への直接DMで受け付けます。
                    </p>
                </Box>

                {/* 送信フォームの中身 */}
                <RegisterForm/>

            </Box>
        </div>
    )
}