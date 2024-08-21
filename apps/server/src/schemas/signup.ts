import { z } from 'zod';

export const schema = z
  .object({
    username: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]{2,14}$/, {
      message: 'Invalid Username',
    }),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .max(32, 'Password must be at max 32 characters long.')
      .regex(
        /^(?:(?=.*[a-zA-Z])(?=.*\d)|(?=.*[a-zA-Z])(?=.*[^a-zA-Z\d])|(?=.*\d)(?=.*[^a-zA-Z\d])).{8,32}$/,
        {
          message:
            'Password must contain at least two of the following: letters, numbers, and symbols',
        },
      ),
    confirmPassword: z
      .string()
      .min(1, { message: 'Confirm Password is required' }),
    email: z.string().email({ message: 'Invalid Email' }),
    mailingList: z.enum(['subscribed', 'unsubscribed']),
    birthdate: z
      .object({
        day: z
          .string()
          .regex(/^\d+$/, { message: 'Day must be a number' })
          .transform(day => Number(day))
          .refine(day => day >= 1 && day <= 31, {
            message: 'Day must be between 1 and 31',
          }),
        month: z
          .string()
          .regex(/^\d+$/, { message: 'Month must be a number' })
          .transform(month => Number(month))
          .refine(month => month >= 1 && month <= 12, {
            message: 'Month must be between 1 and 12',
          }),
        year: z
          .string()
          .regex(/^\d+$/, { message: 'Year must be a number' })
          .transform(year => Number(year))
          .refine(year => year >= 1900 && year <= 2100, {
            message: 'Year must be between 1900 and 2100',
          }),
      })
      .refine(
        ({ day, month, year }) => {
          const today = new Date();
          const inputDate = new Date(year, month - 1, day);

          if (
            inputDate.getDate() !== day ||
            inputDate.getMonth() !== month - 1 ||
            inputDate.getFullYear() !== year
          ) {
            return false;
          }

          return today >= inputDate;
        },
        {
          message: 'Please enter a valid calendar date not in the future',
        },
      )
      .refine(
        ({ day, month, year }) => {
          const today = new Date();
          const inputDate = new Date(year, month - 1, day);

          let age = today.getFullYear() - inputDate.getFullYear();

          if (
            today.getMonth() < inputDate.getMonth() ||
            (today.getMonth() === inputDate.getMonth() &&
              today.getDate() < inputDate.getDate())
          ) {
            age -= 1;
          }

          return age >= 18;
        },
        {
          message: 'You must be 18 years or older',
        },
      )
      .transform(({ day, month, year }) => new Date(year, month - 1, day)),

    termsOfService: z.literal('accepted', {
      message: 'Must accept terms of service',
    }),
  })
  .superRefine(({ password, confirmPassword }, ctx) => {
    if (password != confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'Passwords did not match',
      });
    }
  });

export type SignupForm = z.infer<typeof schema>;
