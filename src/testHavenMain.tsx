import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import HavenTestApp from './HavenTestApp.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HavenTestApp />
  </StrictMode>,
);

