import { z } from 'zod';

export const schema = z.object({
  username: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

export type LoginForm = z.infer<typeof schema>;
