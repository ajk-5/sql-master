import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { ProgressProvider } from '@/state/ProgressProvider';
import { AuthProvider } from '@/auth/AuthProvider';
import '@/styles/globals.css';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/bodoni-moda/500.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root container missing from index.html');

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ProgressProvider>
          <App />
        </ProgressProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
