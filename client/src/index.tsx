import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import {createBrowserRouter, RouterProvider, useParams} from "react-router-dom";
import {Signup} from "./routes/signup";
import { Landing } from './routes/landing';
import { Editor } from './routes/editor';
import { Userpage } from './routes/userpage';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

export const endpoint = process.env.REACT_APP_API_ENDPOINT;

export interface ApiError {
  errorMessage: string,
  errorCode: number,
}

export function isError(e: unknown): e is ApiError {
  return !!e && typeof e === "object"
    && "errorMessage" in e && typeof e.errorMessage === "string"
    && "errorCode" in e && typeof e.errorCode === "number";
}

export function errorMessage(e: ApiError): string {
  return `Error ${e.errorCode}: ${e.errorMessage}`;
}

export async function checkLoginStatus() {
  try {
    const response = await fetch(`${endpoint}/api/get_login`, {
      method: 'GET',
      credentials: 'include',
    });

    if (response.ok) {
      return true;
    }
  } catch (error) {
    console.error('Error checking login status:', error);
  }

  return false;
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <Landing />
  },
  {
    path: "/:userid",
    element: <Userpage />
  },
  {
    path: "/signup",
    element: <Signup />
  },
  {
    path: "/editor",
    element: <Editor />
  }
])

root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);

