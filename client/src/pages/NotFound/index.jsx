import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CircleAnimation from "./CircleAnimation.jsx";
import CharactersAnimation from "./CharactersAnimation.jsx";

export function NotFoundPage() {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full h-screen bg-black overflow-hidden flex justify-center items-center relative select-none">
      <div className="absolute flex flex-col justify-center items-center w-[90%] h-[90%] z-[100]">
        <div
          className={`flex flex-col items-center transition-opacity duration-500 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <h1 className="text-2xl sm:text-3xl md:text-[35px] font-bold text-zinc-950 tracking-tight text-center drop-shadow-sm m-[1%]">
            Page Not Found
          </h1>
          <div className="text-6xl sm:text-7xl md:text-[80px] font-extrabold text-zinc-950 tracking-tighter m-[1%] drop-shadow-sm">
            404
          </div>
          <p className="w-full max-w-md px-4 text-sm sm:text-base text-center text-zinc-800 font-medium m-[1%]">
            The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mt-6 w-full sm:w-auto px-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="text-zinc-950 bg-white/90 sm:bg-transparent border-2 border-zinc-950 hover:bg-zinc-950 hover:text-white transition-all duration-300 ease-in-out px-6 py-2.5 rounded-lg text-sm sm:text-base font-semibold flex items-center justify-center gap-2 hover:scale-105 cursor-pointer shadow-sm active:scale-95"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m12 19-7-7 7-7" />
                <path d="M19 12H5" />
              </svg>
              Go Back
            </button>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="bg-zinc-950 text-white hover:bg-zinc-800 transition-all duration-300 ease-in-out px-6 py-2.5 rounded-lg text-sm sm:text-base font-semibold flex items-center justify-center gap-2 hover:scale-105 cursor-pointer shadow-md active:scale-95"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              Go Home
            </button>
          </div>
        </div>
      </div>
      <CharactersAnimation />
      <CircleAnimation />
    </div>
  );
}

export default NotFoundPage;
