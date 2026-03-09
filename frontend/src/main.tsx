/*
main.tsx

Application entry point for the React frontend.

Responsibilities:
1. Mount the React application into the DOM.
2. Enable client-side routing using BrowserRouter.
3. Wrap the application in React.StrictMode for development checks.
4. Load global styles (Tailwind + custom UI styles).
*/

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';


/*
Create the React root and attach the application to the HTML element
with id="root" defined in index.html.
*/
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(

  /*
  React.StrictMode enables additional development checks such as:
  - detecting unsafe lifecycle methods
  - highlighting unexpected side effects
  - helping identify potential bugs early
  */
  <React.StrictMode>

    {/* BrowserRouter enables client-side navigation between pages */}
    <BrowserRouter>

      {/* Main application component */}
      <App />

    </BrowserRouter>

  </React.StrictMode>

);