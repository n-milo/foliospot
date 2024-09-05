import { Button } from "flowbite-react";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { checkLoginStatus, endpoint } from "..";

export function Landing() {
  const navigate = useNavigate();
  const nameRef = useRef<HTMLInputElement|null>(null);

  const signup = () => {
    if (nameRef.current !== null && nameRef.current.value !== "") {
      navigate(`/signup?name=${encodeURIComponent(nameRef.current.value)}`)
    } else {
      navigate(`/signup`)
    }
  };

  useEffect(() => {
    (async () => {
      if (await checkLoginStatus()) {
        navigate("/editor");
      }
    })();
  }, []);

  return <div className="w-screen mt-8 flex flex-col items-center gap-6">
    <h1 className="text-7xl font-bold">portfol.io</h1>
    <h2 className="text-2xl">Create a beautiful portfolio page in seconds.</h2>
    <div className="flex flex-col items-center">
      <div>
        <span className="mr-1">portfol.io/</span>
        <input ref={nameRef} className="rounded-lg" type="text" placeholder="yourname" />
      </div>
    </div>
    <div className="flex flex-col items-center gap-2">
      <Button color="light" onClick={signup}>Claim your username →</Button>
      <a className="text-sm text-gray-600 underline" href={`${endpoint}/auth/google/login`}>or login with Google</a>
    </div>
    <img className="w-20" src="/demo-screenshot.png" />
    <h2>Features</h2>
  </div>;
}