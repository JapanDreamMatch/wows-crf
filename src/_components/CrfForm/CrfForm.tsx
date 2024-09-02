import FormContent from "@/_components/FormContent/FormContent";
import {defaultHandleClick} from "@/_components/FormContent/useFormContent";

export default function CrfForm(


    ){

    return(
        <>
            <FormContent
                placeholder="Please type"
                onFocusHandle={ defaultHandleClick }
            />
        </>
    )
}