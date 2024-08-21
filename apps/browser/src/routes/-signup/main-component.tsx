import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { Tab, TabGroup, TabList, TabPanels } from '@headlessui/react';
import { Minus } from 'lucide-react';
import { SignupSchema } from './signup';
import EmailPanel from './email-panel';
import BirthdayPanel from './birthay-panel';
import UsernamePanel from './username-panel';
import PasswordPanel from './password-panel';
import TermsOfServicePanel from './terms-of-service-panel';

const defaultValues: SignupSchema = {
  username: '',
  password: '',
  confirmPassword: '',
  birthdate: {
    day: '',
    month: '',
    year: '',
  },
  email: '',
  termsOfService: false,
  mailingList: true,
};

export default function SignupForm() {
  const form = useForm<SignupSchema>({
    defaultValues,
    onSubmit: async ({ value }) => {
      console.info(value);

      const res = await fetch('http://localhost:3347/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(value),
      });

      if (res.ok) {
        console.log('Signup successful:', await res.json());
      } else {
        console.error('Signup failed:', await res.text());
      }
    },
  });

  const [selectedIndex, setSelectedIndex] = useState(0);
  const handleClick = () => setSelectedIndex(prev => prev + 1);

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className='min-h-[600px] w-96'>
      <TabGroup selectedIndex={selectedIndex} onChange={setSelectedIndex}>
        <TabList className='text-center'>
          {Array.from(Array(5).keys()).map(index => (
            <Tab key={index}>
              <Minus />
            </Tab>
          ))}
        </TabList>
        <TabPanels>
          <EmailPanel form={form} onBtnClick={handleClick} />
          <BirthdayPanel form={form} onBtnClick={handleClick} />
          <UsernamePanel form={form} onBtnClick={handleClick} />
          <PasswordPanel form={form} onBtnClick={handleClick} />
          <TermsOfServicePanel form={form} onBtnClick={handleClick} />
        </TabPanels>
      </TabGroup>
    </form>
  );
}
