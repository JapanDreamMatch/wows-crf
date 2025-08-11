import Link from "next/link";
import {Box, Button, Heading} from "@chakra-ui/react";

export default function Home() {
    return (
        <div className="text-slate-100 bg-gray-800 min-h-screen">
            <Box m={4} className="max-w-full">
                <Box className="max-w-3xl p-2 mx-auto my-4 text-center">
                    <Heading size="lg" className="mb-4">送信に成功しました</Heading>
                    <Link href="/public" className="">
                        <Button colorScheme="teal">
                            トップページに戻る
                        </Button>
                    </Link>
                </Box>
            </Box>
        </div>
    );
}
