export interface FormContentProps {
    placeholder: string;
    onFocusHandle: (value: string) => void;
};

export function defaultHandleClick(value: string) {
    alert('You clicked me!');
}