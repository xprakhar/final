import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createRouter } from './create-router';
import { RouterProvider } from '@tanstack/react-router';
import './index.css';

const router = createRouter();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
