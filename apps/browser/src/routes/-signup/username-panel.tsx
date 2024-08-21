import type { PanelProps } from './signup.d.ts';
import { useEffect, useState } from 'react';
import { useDebounce } from 'use-debounce';
import { Description, Field, Input, Label, TabPanel } from '@headlessui/react';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { ArrowRight } from 'lucide-react';
import { z } from 'zod';

const schema = z.string().regex(/^[a-z0-9_-]{3,15}$/);

export default function UsernamePanel({ form, onBtnClick }: PanelProps) {
  const username = form.useStore(store => store.values.username);

  const [debounced] = useDebounce(username, 500);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAvailable = async (name: string, signal: AbortSignal) => {
      try {
        const avaibility = await new Promise<boolean>((resolve, reject) => {
          const timer = setTimeout(() => {
            if (name !== 'Admin') {
              resolve(true);
            } else {
              resolve(false);
            }
          });

          signal.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new DOMException('Avaibility check aborted', 'AbortError'));
          });
        });

        return avaibility;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          console.log('Aborted');
          return false;
        }
        throw error;
      }
    };

    const controller = new AbortController();

    const { signal } = controller;

    if (debounced) {
      checkAvailable(debounced, signal)
        .then(value => setIsAvailable(value))
        .catch(() => setIsAvailable(null));
    } else {
      setIsAvailable(null);
    }

    return () => {
      controller.abort();
    };
  }, [debounced]);

  const isDisabled = !schema.safeParse(username).success || !isAvailable;

  return (
    <TabPanel className='flex flex-1 flex-col gap-3'>
      <h5 className='text-center text-2xl'>Choose a username</h5>
      <h6 className='text-center text-lg'>Make it cool or deadly</h6>
      <div className='flex flex-1 flex-col justify-between gap-6'>
        <div className='flex flex-col gap-4'>
          <form.Field
            name='username'
            validatorAdapter={zodValidator()}
            validators={{ onBlur: schema }}>
            {field => (
              <Field>
                <div className='relative'>
                  <Input
                    autoComplete='off'
                    placeholder='Username'
                    className='peer block w-full appearance-none border border-neutral-500 px-4 pb-1 pt-6 placeholder-transparent placeholder-shown:py-3.5 focus:border-sky-400 focus:ring-1 focus:ring-sky-200 dark:bg-neutral-900'
                    type='text'
                    name={field.name}
                    id={field.name}
                    value={field.state.value}
                    onChange={e => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                  <Label className='pointer-events-none absolute top-0 translate-y-1 px-4 text-sm text-neutral-500 transition-all duration-100 ease-in-out peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base'>
                    Username
                  </Label>
                </div>

                {isAvailable === false && (
                  <Description className='mt-3 text-sm'>
                    Username is not available
                  </Description>
                )}
              </Field>
            )}
          </form.Field>
        </div>
        <div className='self-center'>
          <button
            className='flex size-20 items-center justify-center rounded-2xl border-2 border-red-500 bg-red-500 p-5 disabled:border-neutral-600 disabled:bg-transparent disabled:text-neutral-400'
            type='button'
            onClick={onBtnClick}
            disabled={isDisabled}>
            <ArrowRight size={32} />
          </button>
        </div>
      </div>
    </TabPanel>
  );
}
