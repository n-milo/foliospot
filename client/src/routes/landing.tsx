import { Button, Spinner } from "flowbite-react";
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

//   return <div className="w-screen mt-8 flex flex-col items-center gap-6">
//     <h1 className="text-7xl font-bold">portfol.io</h1>
//     <h2 className="text-2xl">Create a beautiful portfolio page in seconds.</h2>
//     <div className="flex flex-col items-center">
//       <div>
//         <span className="mr-1">portfol.io/</span>
//         <input ref={nameRef} className="rounded-lg" type="text" placeholder="yourname" />
//       </div>
//     </div>
//     <div className="flex flex-col items-center gap-2">
//       <Button color="light" onClick={signup}>Claim your username →</Button>
//       <a className="text-sm text-gray-600 underline" href={`${endpoint}/auth/google/login`}>or login with Google</a>
//     </div>
//     <img className="w-20" src="/demo-screenshot.png" />
//     <h2>Features</h2>
//   </div>;
// }

return (
  <div className="w-full min-h-screen bg-gradient-to-b from-blue-100 to-white">
    <div className="container mx-auto px-4 py-16">
      <header className="text-center mb-12">
        <h1 className="text-6xl font-bold text-blue-600 mb-4">foliospot.io</h1>
        <h2 className="text-2xl text-gray-700">Create a stunning portfolio in minutes</h2>
      </header>

      <div className="max-w-3xl mx-auto text-center mb-12">
        <p className="text-xl text-gray-600 mb-8">
          Showcase your work, impress clients, and land your dream job with a professional portfolio website.
        </p>
        <div className="mb-4">
          <span className="text-gray-600 mr-1">foliospot.io/</span>
          <input ref={nameRef} className="rounded-lg" type="text" placeholder="yourname" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <Button gradientDuoTone="purpleToBlue" onClick={signup}>Claim your username →</Button>
          <a className="text-sm text-gray-600 underline" href={`${endpoint}/auth/google/login`}>or login with Google</a>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8 mb-16">
        <FeatureCard
          icon="🚀"
          title="Quick Setup"
          description="Create your portfolio in minutes with our intuitive editor."
        />
        <FeatureCard
          icon="🎨"
          title="Customizable Design"
          description="Choose from various themes or customize to match your style."
        />
        <FeatureCard
          icon="📱"
          title="Mobile Responsive"
          description="Your portfolio looks great on all devices, from phones to desktops."
        />
      </div>

      <div className="text-center mb-16">
        <h3 className="text-2xl font-semibold text-gray-800 mb-4">Join thousands of professionals showcasing their work</h3>
      </div>

      <footer className="text-center text-gray-600">
        <p>&copy; 2024 foliospot.io. All rights reserved.</p>
        <a className="text-blue-500 hover:underline" href={`${endpoint}/auth/google/login`}>Log in with Google</a>
      </footer>
    </div>
  </div>
);
}

function FeatureCard({ icon, title, description }: {icon: string, title: string, description: string}) {
return (
  <div className="bg-white p-6 rounded-lg shadow-md">
    <div className="text-4xl mb-4">{icon}</div>
    <h3 className="text-xl font-semibold mb-2">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </div>
);
}