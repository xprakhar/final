import { z } from 'zod';
import { ArrowRight } from 'lucide-react';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { TabPanel, Field, Input, Label } from '@headlessui/react';
import type { PanelProps } from './signup.d.ts';
// Define a schema for the date object

const daySchema = z
  .string()
  .min(1, 'Day is required')
  .regex(/^\d+$/, 'Day must be a number')
  .catch('')
  .transform(Number)
  .refine(day => day >= 1 && day <= 31, {
    message: 'Day must be between 1 and 31',
  });

const monthSchema = z
  .string()
  .min(1, 'Month is required')
  .regex(/^\d+$/, 'Month must be a number')
  .catch('')
  .transform(Number)
  .refine(month => month >= 1 && month <= 12, {
    message: 'Month must be between 1 and 12',
  });

const yearSchema = z
  .string()
  .min(1, 'Year is required')
  .regex(/^\d+$/, 'Year must be a number')
  .catch('')
  .transform(Number)
  .refine(year => year >= 1900 && year <= 2100, {
    message: 'Year must be between 1900 and 2100',
  });

// Function to check if the date is valid
function isValidDate(day: number, month: number, year: number) {
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return false;
  }

  const today = new Date();
  // Strip time from today's date by setting it to midnight
  today.setHours(0, 0, 0, 0);

  // Compare the time values of the two dates
  return date.getTime() < today.getTime();
}

// Function to check if age is at least 18 years
function isAtLeast18YearsOld(day: number, month: number, year: number) {
  const today = new Date();
  const birthDate = new Date(year, month - 1, day);

  // Calculate age
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();

  // Adjust age if the current month/day is before the birth month/day
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return age >= 18;
}

const schema = z
  .object({
    day: daySchema,
    month: monthSchema,
    year: yearSchema,
  })
  .refine(data => isValidDate(data.day, data.month, data.year), {
    message: 'Invalid date',
  })
  .refine(data => isAtLeast18YearsOld(data.day, data.month, data.year), {
    message: 'Age must be at least 18 years old',
  });

export default function BirthdayPanel({ form, onBtnClick }: PanelProps) {
  const birthDate = form.useStore(store => store.values.birthdate);

  const isDisabled = !schema.safeParse(birthDate).success;

  return (
    <TabPanel className='flex flex-1 flex-col gap-3'>
      <h5 className='text-center text-2xl'>When were you born?</h5>
      <h6 className='text-center text-lg'>
        Let&apos;s find out how old you are.
      </h6>
      <div className='flex flex-1 flex-col justify-between gap-6'>
        <form.Field
          name='birthdate'
          validatorAdapter={zodValidator()}
          validators={{ onBlur: schema }}>
          {({ state, handleBlur, handleChange }) => {
            const { day: dd, month: mm, year: yy } = state.value;

            return (
              <div>
                <div className='group relative flex w-full border border-gray-500 bg-transparent focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600'>
                  <form.Field
                    name='birthdate.day'
                    validatorAdapter={zodValidator()}
                    validators={{
                      onBlur: daySchema,
                    }}>
                    {day => (
                      <Field className='relative w-12 group-focus-within:flex-1'>
                        <Input
                          placeholder='DD'
                          autoComplete='off'
                          className='peer/day block w-full appearance-none px-4 pb-1 pt-6 placeholder:text-transparent placeholder-shown:py-3.5 focus:pb-1 focus:pt-6 focus:outline-none focus:ring-0 focus:placeholder:text-neutral-400 dark:bg-neutral-900'
                          type='text'
                          name={day.name}
                          id={day.name}
                          value={day.state.value}
                          onChange={e => {
                            day.handleChange(e.target.value);
                            handleChange({
                              ...state.value,
                              day: e.target.value,
                            });
                          }}
                          onBlur={() => {
                            day.handleBlur();
                            handleBlur();

                            day.setValue(
                              z
                                .string()
                                .regex(/^\d+$/)
                                .catch('')
                                .parse(day.state.value),
                            );
                          }}
                        />
                        <Label className='pointer-events-none absolute top-0 translate-y-0 px-4 text-sm text-neutral-500 text-transparent transition-all duration-100 ease-in-out group-focus-within:text-neutral-500 peer-placeholder-shown/day:top-1/2 peer-placeholder-shown/day:-translate-y-1/2 peer-placeholder-shown/day:text-base peer-focus/day:top-0 peer-focus/day:translate-y-0 peer-focus/day:text-sm'>
                          Day
                        </Label>
                      </Field>
                    )}
                  </form.Field>

                  <form.Field
                    name='birthdate.month'
                    validatorAdapter={zodValidator()}
                    validators={{
                      onBlur: monthSchema,
                    }}>
                    {month => (
                      <Field className='relative w-12 group-focus-within:flex-1'>
                        <Input
                          placeholder='MM'
                          autoComplete='off'
                          className='peer/month block w-full appearance-none border-0 px-4 pb-1 pt-6 placeholder:text-transparent placeholder-shown:py-3.5 focus:pb-1 focus:pt-6 focus:outline-none focus:ring-0 focus:placeholder:text-neutral-400 dark:bg-neutral-900'
                          type='text'
                          name={month.name}
                          id={month.name}
                          value={month.state.value}
                          onChange={e => {
                            month.handleChange(e.target.value);
                            handleChange({
                              ...state.value,
                              month: e.target.value,
                            });
                          }}
                          onBlur={() => {
                            month.handleBlur();
                            handleBlur();
                            month.setValue(
                              z
                                .string()
                                .regex(/^\d+$/)
                                .catch('')
                                .parse(month.state.value),
                            );
                          }}
                        />
                        <Label className='pointer-events-none absolute top-0 translate-y-0 px-4 text-sm text-neutral-500 text-transparent transition-all duration-100 ease-in-out group-focus-within:text-neutral-500 peer-placeholder-shown/month:top-1/2 peer-placeholder-shown/month:-translate-y-1/2 peer-placeholder-shown/month:text-base peer-focus/month:top-0 peer-focus/month:translate-y-0 peer-focus/month:text-sm'>
                          Month
                        </Label>
                      </Field>
                    )}
                  </form.Field>

                  <form.Field
                    name='birthdate.year'
                    validatorAdapter={zodValidator()}
                    validators={{
                      onBlur: yearSchema,
                    }}>
                    {year => (
                      <Field className='relative w-12 group-focus-within:flex-1'>
                        <Input
                          placeholder='YYYY'
                          autoComplete='off'
                          className='peer/year block w-full appearance-none border-0 px-4 pb-1 pt-6 placeholder:text-transparent placeholder-shown:py-3.5 focus:pb-1 focus:pt-6 focus:outline-none focus:ring-0 focus:placeholder:text-neutral-400 dark:bg-neutral-900'
                          type='text'
                          name={year.name}
                          id={year.name}
                          value={year.state.value}
                          onChange={e => {
                            year.handleChange(e.target.value);
                            handleChange({
                              ...state.value,
                              year: e.target.value,
                            });
                          }}
                          onBlur={() => {
                            year.handleBlur();
                            handleBlur();
                            year.setValue(
                              z
                                .string()
                                .regex(/^\d+$/)
                                .catch('')
                                .parse(year.state.value),
                            );
                          }}
                        />
                        <Label className='pointer-events-none absolute top-0 translate-y-0 px-4 text-sm text-transparent transition-all duration-100 ease-in-out group-focus-within:text-neutral-500 peer-placeholder-shown/year:top-1/2 peer-placeholder-shown/year:-translate-y-1/2 peer-placeholder-shown/year:text-base peer-focus/year:top-0 peer-focus/year:translate-y-0 peer-focus/year:text-sm'>
                          Year
                        </Label>
                      </Field>
                    )}
                  </form.Field>
                  <span
                    className={`pointer-events-none visible absolute px-4 text-neutral-500 group-focus-within:invisible ${dd || mm || yy ? 'top-0 translate-y-0 text-sm' : 'top-1/2 -translate-y-1/2 text-base'}`}>
                    Birthdate
                  </span>
                </div>

                {state.meta.errors && (
                  <p className='mt-3 text-sm'>{state.meta.errors}</p>
                )}
              </div>
            );
          }}
        </form.Field>
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
