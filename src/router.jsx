import { createHashRouter } from "react-router-dom";
import Page1 from "./pages/Page1";
import Page2 from "./pages/Page2";
import App from "./App";
export const router = createHashRouter([
    {
      path: '/',
      element: <App />,
      children: [
        { path: 'page1', element: <Page1 /> },
        { path: 'page2', element: <Page2 /> }
      ]
    }
  ]);