import { useForm } from '@tanstack/react-form';

export interface SignupSchema {
  username: string;
  password: string;
  confirmPassword: string;
  birthdate: {
    day: string;
    month: string;
    year: string;
  };
  email: string;
  termsOfService: boolean;
  mailingList: boolean;
}

export interface PanelProps {
  form: ReturnType<typeof useForm<SignupSchema>>;
  onBtnClick: () => void;
}
