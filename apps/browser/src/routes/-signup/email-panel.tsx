import { z } from 'zod';
import {
  TabPanel,
  Field,
  Input,
  Label,
  Checkbox,
  Description,
} from '@headlessui/react';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { ArrowRight, Check } from 'lucide-react';
import type { PanelProps } from './signup.d.ts';

const schema = z.string().email({ message: 'Please enter a valid Email ID' });

export default function EmailPanel({ form, onBtnClick }: PanelProps) {
  const email = form.useStore(state => state.values.email);
  const isDisabled = !schema.safeParse(email).success;

  return (
    <TabPanel className='flex flex-1 flex-col gap-3'>
      <div>
        <h5 className='text-center text-2xl'>What&apos;s your email?</h5>
        <h6 className='text-center text-lg'>
          Don&apos;t worry, we won&apos;t tell anyone
        </h6>
      </div>
      <div className='flex flex-1 flex-col justify-between gap-6'>
        <div className='flex flex-col gap-1'>
          <form.Field
            name='email'
            validatorAdapter={zodValidator()}
            validators={{
              onBlur: schema,
            }}>
            {field => (
              <Field>
                <div className='relative'>
                  <Input
                    className='peer block w-full appearance-none border border-neutral-500 px-4 pb-1 pt-6 placeholder-transparent placeholder-shown:py-3.5 focus:border-sky-400 focus:ring-1 focus:ring-sky-200 dark:bg-neutral-900'
                    placeholder='Email'
                    autoComplete='off'
                    type='email'
                    name={field.name}
                    id={field.name}
                    value={field.state.value}
                    onChange={e => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                  <Label className='pointer-events-none absolute top-0 translate-y-1 px-4 text-sm text-neutral-500 transition-all duration-100 ease-in-out peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base'>
                    Email
                  </Label>
                </div>
                {field.state.meta.errors && (
                  <Description className='my-3 text-xs'>
                    {field.state.meta.errors}
                  </Description>
                )}
              </Field>
            )}
          </form.Field>
          <form.Field
            name='mailingList'
            validatorAdapter={zodValidator()}
            validators={{ onBlur: z.boolean() }}>
            {field => (
              <Field className='flex items-center gap-3'>
                <Checkbox
                  className='group inline-flex size-6 appearance-none items-center justify-center rounded-md border border-neutral-400 bg-neutral-50 focus:border-neutral-200 focus:ring-1 focus:ring-sky-600 focus:ring-offset-1 data-[checked]:border-0 data-[checked]:bg-red-500'
                  id={field.name}
                  checked={field.state.value}
                  onChange={field.handleChange}>
                  <Check className='invisible text-white group-data-[checked]:visible' />
                </Checkbox>
                <Label className='text-sm'>
                  Yes;Recieve mails for promotions, newsletter, and updates from
                  us.
                </Label>
              </Field>
            )}
          </form.Field>
        </div>
        <div className='self-center'>
          <button
            className='flex size-20 items-center justify-center rounded-2xl border-2 border-red-500 bg-red-500 p-5 disabled:border-neutral-600 disabled:bg-transparent disabled:text-neutral-400'
            type='button'
            disabled={isDisabled}
            onClick={onBtnClick}>
            <ArrowRight size={32} />
          </button>
        </div>
      </div>
    </TabPanel>
  );
}
