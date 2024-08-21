import type { PanelProps } from './signup.d.ts';
import { ArrowRight, CircleCheckBig } from 'lucide-react';
import {
  TabPanel,
  Field,
  Input,
  Label,
  Description,
  Button,
} from '@headlessui/react';
import { z } from 'zod';
import { zodValidator } from '@tanstack/zod-form-adapter';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(32, 'Password must be shorter than 32 characters')
  .refine(
    password => {
      // Check for at least two categories: number, letter, symbol
      const hasNumber = /\d/.test(password);
      const hasLetter = /[a-zA-Z]/.test(password);
      const hasSymbol = /[^a-zA-Z0-9]/.test(password);
      const categories = [hasNumber, hasLetter, hasSymbol].filter(Boolean);

      return categories.length >= 2;
    },
    {
      message:
        'Password must contain at least two of the following: a number, a letter, a symbol',
    },
  );

const schema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Passwords must match',
    path: ['confirmPassword'],
  });

function PasswordPanel({ form, onBtnClick }: PanelProps) {
  const password = form.useStore(store => {
    return {
      password: store.values.password,
      confirmPassword: store.values.confirmPassword,
    };
  });

  const is8Long = z.string().min(8).safeParse(password.password).success;
  const isDiverse = z
    .string()
    .refine(value => {
      // Check for at least two categories: number, letter, symbol
      const hasNumber = /\d/.test(value);
      const hasLetter = /[a-zA-Z]/.test(value);
      const hasSymbol = /[^a-zA-Z0-9]/.test(value);
      const categories = [hasNumber, hasLetter, hasSymbol].filter(Boolean);

      return categories.length >= 2;
    })
    .safeParse(password.password).success;
  const isDisabled = !schema.safeParse(password).success;

  return (
    <TabPanel className='flex flex-1 flex-col gap-3'>
      <h5 className='text-center text-2xl'>Choose a Password</h5>
      <h6 className='text-center text-lg'>One Account for all our apps</h6>
      <div className='flex flex-1 flex-col justify-between gap-6'>
        <div className='flex flex-col gap-4'>
          <form.Field
            name='password'
            validatorAdapter={zodValidator()}
            validators={{
              onBlur: passwordSchema,
            }}>
            {field => (
              <div className='space-y-3'>
                <Field>
                  <div className='relative'>
                    <Input
                      placeholder='Password'
                      autoComplete='new-password'
                      className='peer block w-full appearance-none border border-neutral-500 px-4 pb-1 pt-6 placeholder-transparent placeholder-shown:py-3.5 focus:border-sky-400 focus:ring-1 focus:ring-sky-200 dark:bg-neutral-900'
                      type='password'
                      name={field.name}
                      id={field.name}
                      value={field.state.value}
                      onChange={e => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                    <Label className='pointer-events-none absolute top-0 translate-y-1 px-4 text-sm text-neutral-500 transition-all duration-100 ease-in-out peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base'>
                      Password
                    </Label>
                  </div>
                </Field>
                <div className='text-balance text-sm'>
                  <ul className='space-y-2 *:flex *:gap-2'>
                    <li>
                      <CircleCheckBig
                        size={20}
                        className={`flex-shrink-0 ${is8Long && 'text-green-600'}`}
                      />
                      <span>Password must be at least 8 characters long</span>
                    </li>
                    <li>
                      <CircleCheckBig
                        size={20}
                        className={`flex-shrink-0 ${isDiverse && 'text-green-600'}`}
                      />
                      <span>
                        Password must contain at least two of the following: a
                        number, a letter, a symbol
                      </span>
                    </li>
                    <li>
                      <CircleCheckBig
                        size={20}
                        className={`flex-shrink-0 ${is8Long && isDiverse && 'text-green-600'}`}
                      />
                      <span>
                        Password must be at least fair or good strength
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </form.Field>
          <form.Field
            name='confirmPassword'
            validatorAdapter={zodValidator()}
            validators={{
              onBlur: z.string().refine(
                value => {
                  return value === form.getFieldValue('password');
                },
                {
                  message: 'Passwords must match',
                },
              ),
            }}>
            {field => (
              <Field>
                <div className='relative'>
                  <Input
                    placeholder='Confirm Password'
                    autoComplete='new-password'
                    className='peer block w-full appearance-none border border-neutral-500 px-4 pb-1 pt-6 placeholder-transparent placeholder-shown:py-3.5 focus:border-sky-400 focus:ring-1 focus:ring-sky-200 dark:bg-neutral-900'
                    type='password'
                    name={field.name}
                    id={field.name}
                    value={field.state.value}
                    onChange={e => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                  <Label className='pointer-events-none absolute top-0 translate-y-1 px-4 text-sm text-neutral-500 transition-all duration-100 ease-in-out peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base'>
                    Confirm Password
                  </Label>
                </div>
                {field.state.meta.errors && (
                  <Description className='mt-3 text-sm'>
                    {field.state.meta.errors}
                  </Description>
                )}
              </Field>
            )}
          </form.Field>
        </div>
        <div className='self-center'>
          <Button
            className='flex size-20 items-center justify-center rounded-2xl border-2 border-red-500 bg-red-500 p-5 disabled:border-neutral-600 disabled:bg-transparent disabled:text-neutral-400'
            type='button'
            onClick={onBtnClick}
            disabled={isDisabled}>
            <ArrowRight size={32} />
          </Button>
        </div>
      </div>
    </TabPanel>
  );
}

export default PasswordPanel;
