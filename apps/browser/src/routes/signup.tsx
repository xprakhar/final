import { createFileRoute } from '@tanstack/react-router';
import SignupForm from './-signup/main-component';

export const Route = createFileRoute('/signup')({
  component: SignupForm,
});
