import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route, RouterProvider } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import Page1 from './pages/Page1/index.jsx';
import {router} from './router.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
