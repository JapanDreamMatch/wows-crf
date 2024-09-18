import { useForm } from "react-hook-form";

type FormInputs = {
    test: string
}
// https://legacy.react-hook-form.com/api/useform/formstate/
export default function SendPage() {
    const {
        register,
        handleSubmit,
        // Read the formState before render to subscribe the form state through Proxy
        formState: { errors, isDirty, isSubmitting, touchedFields, submitCount },
    } = useForm<FormInputs>();

    const onSubmit = (data: FormInputs) => {
        return new Promise<void>((resolve) => {
            setTimeout(() => resolve(), 1000);
        });
    };

    return (
        <div>
            <form onSubmit={handleSubmit(onSubmit)}>
                <input {...register("test")} />
                <input type="submit"/>
            </form>
            <p>isDirty: {isDirty ? "true" : "false"}</p>
            <p>isSubmitting: {isSubmitting ? "true" : "false"}</p>
        </div>

    );
}