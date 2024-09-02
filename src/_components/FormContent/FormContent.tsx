import {Textarea} from "@chakra-ui/react";
import {defaultHandleClick, FormContentProps} from "@/_components/FormContent/useFormContent";

export default function FormContent({
    placeholder = "Please type",
    onFocusHandle = defaultHandleClick
}: FormContentProps){

    return(
        <>
            <Textarea
                placeholder={ placeholder }
                size='xs'
                resize='none'
                onFocus={ (e) => onFocusHandle(e.target.value) }
            />
        </>
    )
}