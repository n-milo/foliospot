import {Alert, Button, Checkbox, Label, TextInput} from "flowbite-react";
import React, { ChangeEvent, useEffect, useRef, useState } from "react";
import { endpoint } from "..";
import { Form, useLocation } from "react-router-dom";

enum FormStatus {
  Initial,
  Checking,
  Bad,
  Good
};

export function Signup() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);

  const finish = !!queryParams.get("finish");
  const error = !!queryParams.get("error");

  const [username, setUsername] = useState(queryParams.get("name") ?? "");
  const [helper, setHelper] = useState("");
  const [status, setStatus] = useState(FormStatus.Initial);
  const lastRequestID = useRef(0);

  const [signupError, setSignupError] = useState<string|null>(null);

  const checkUsername = async (username: string) => {
    const currentRequestID = ++lastRequestID.current;

    let available: boolean;

    try {
      const resp = await fetch(`${endpoint}/api/check_username?username=${username}`);
      if (!resp.ok) {
        const text = await resp.text();
        setHelper(`Error: ${text}`);
        setStatus(FormStatus.Bad);
        return;
      }

      available = await resp.json();
    } catch (error) {
      setHelper(`Error: ${error}`);
      setStatus(FormStatus.Bad);
      return;
    }

    if (currentRequestID == lastRequestID.current) {
      if (available) {
        setHelper(`${username} is available!`);
        setStatus(FormStatus.Good);
      } else {
        setHelper(`${username} is not available`);
        setStatus(FormStatus.Bad);
      }
    }
  };

  useEffect(() => {
    if (username === "") {
      setHelper("");
      setStatus(FormStatus.Initial);
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      setHelper("Username must only contain letters, numbers, underscores, and dashes.")
      setStatus(FormStatus.Bad);
      return;
    }

    if (username.length > 16 || username.length < 2) {
      setHelper("Username must be between 2 and 16 characters long.")
      setStatus(FormStatus.Bad);
      return;
    }

    setStatus(FormStatus.Checking);
    setHelper("Checking...");

    const timeoutID = setTimeout(() => {
      checkUsername(username);
    }, 500);

    return () => clearTimeout(timeoutID);
  }, [username]);

  const updateUsername = (e: ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
  };

  return <div>
    <form
      className="flex max-w-md flex-col gap-4 mt-8 m-auto"
      action={`${endpoint}/auth/google/signup`}
      method="GET"
    >
    {
      finish
        ? <Alert color="info">You don't have an account with us! Finish signing up below.</Alert>
        : null
    }
    {
      error
        ? <Alert color="failure">An error occurred while signing you up. Please try again.</Alert>
        : null
    }
      <h1 className="text-xl font-bold">Signup</h1>
      <div>
        <div className="mb-2 block">
          <Label htmlFor="username" value="Username" />
        </div>
        <TextInput
          id="username" name="username" type="text" required addon="@"
          value={username}
          onChange={updateUsername}
          color={status === FormStatus.Good ? "success" : status === FormStatus.Bad ? "failure" : undefined}
          helperText={<p>
            This will be your unique handle and URL. It cannot be changed.
            <br />
            {helper}
          </p>}
        />
      </div>
      <Button color="light" type="submit" disabled={status === FormStatus.Bad || status === FormStatus.Checking}>
        <div className="flex flex-row gap-2">
          <img className="h-6" src="/icons/icons8-google.svg" />
          <span>Sign up with Google →</span>
        </div>
      </Button>
      {signupError ? <span className="text-red-700">Error signing up: {signupError}</span> : null}
    </form>
  </div>;
}
