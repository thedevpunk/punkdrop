import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import Group from "./routes/Group.tsx";
import Home from "./routes/Home.tsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
    errorElement: <div>Error, sry 😢</div>,
  },
  {
    path: "/group",
    element: <Group />,
    errorElement: <div>Error, sry 😢</div>,
    children: [
      {
        path: ":id",
        element: <Group />,
        errorElement: <div>Error, sry 😢</div>,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
