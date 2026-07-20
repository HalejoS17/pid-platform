import {
  QueryClientProvider,
} from '@tanstack/react-query';

import {
  StrictMode,
} from 'react';

import {
  createRoot,
} from 'react-dom/client';

import {
  BrowserRouter,
} from 'react-router-dom';

import {
  App,
} from './app/App';

import {
  queryClient,
} from './app/query-client';

import './index.css';

const rootElement =
  document.getElementById(
    'root',
  );

if (!rootElement) {
  throw new Error(
    'Root element was not found.',
  );
}

createRoot(
  rootElement,
).render(
  <StrictMode>
    <QueryClientProvider
      client={queryClient}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);