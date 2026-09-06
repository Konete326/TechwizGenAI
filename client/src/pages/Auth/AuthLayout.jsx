import { useLocation, useNavigate } from "react-router-dom";
import { clsx } from "clsx";
import { Typewriter } from "@/components/ui/Typewriter";
import { AuthFormContainer } from "./AuthForms";

const defaultSignInContent = {
  image: {
    src: "/signin.gif",
    alt: "Sign in animation"
  },
  quote: {
    text: "Welcome Back! The journey continues.",
    author: "Techwiz GenAI"
  }
};

const defaultSignUpContent = {
  image: {
    src: "/signup.gif",
    alt: "Sign up animation"
  },
  quote: {
    text: "Create an account. A new chapter awaits.",
    author: "Techwiz GenAI"
  }
};

export function AuthLayout({ defaultIsSignIn }) {
  const location = useLocation();
  const navigate = useNavigate();

  const isSignIn =
    location.pathname === "/register"
      ? false
      : location.pathname === "/login" || location.pathname === "/auth"
      ? true
      : defaultIsSignIn !== undefined
      ? defaultIsSignIn
      : true;

  const toggleForm = () => {
    navigate(isSignIn ? "/register" : "/login");
  };

  const currentQuote = isSignIn
    ? defaultSignInContent.quote
    : defaultSignUpContent.quote;

  return (
    <div className="w-full min-h-screen md:grid md:grid-cols-2 bg-background overflow-x-hidden overflow-y-auto">
      <div
        className={clsx(
          "flex min-h-screen items-center justify-center p-6 md:p-12 transition-transform duration-700 ease-in-out will-change-transform z-10 bg-background",
          !isSignIn && "md:translate-x-full"
        )}
      >
        <div
          key={isSignIn ? "signin" : "signup"}
          className="w-full max-w-[360px] animate-in fade-in duration-300 ease-out"
        >
          <AuthFormContainer isSignIn={isSignIn} onToggle={toggleForm} />
        </div>
      </div>

      <div
        className={clsx(
          "hidden md:block relative overflow-hidden transition-transform duration-700 ease-in-out will-change-transform border-x border-border/30",
          !isSignIn && "md:-translate-x-full"
        )}
      >
        <img
          src={defaultSignInContent.image.src}
          alt={defaultSignInContent.image.alt}
          className={clsx(
            "absolute inset-0 h-full w-full object-cover pointer-events-none select-none transition-opacity duration-700 ease-in-out",
            isSignIn ? "opacity-100 z-[1]" : "opacity-0 z-0"
          )}
        />
        <img
          src={defaultSignUpContent.image.src}
          alt={defaultSignUpContent.image.alt}
          className={clsx(
            "absolute inset-0 h-full w-full object-cover pointer-events-none select-none transition-opacity duration-700 ease-in-out",
            !isSignIn ? "opacity-100 z-[1]" : "opacity-0 z-0"
          )}
        />
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] z-[2]" />
        <div className="absolute inset-x-0 bottom-0 h-[150px] bg-gradient-to-t from-background to-transparent z-[2]" />

        <div className="relative z-10 flex h-full flex-col items-center justify-end p-6 pb-12">
          <blockquote className="space-y-2 text-center text-foreground max-w-md bg-background/60 p-5 rounded-[var(--radius-md)] border border-border/60 backdrop-blur-md">
            <p className="text-base font-semibold tracking-tight text-white">
              "<Typewriter
                key={currentQuote.text}
                text={currentQuote.text}
                speed={45}
              />"
            </p>
            <cite className="block text-xs font-mono text-zinc-300 not-italic">
              - {currentQuote.author}
            </cite>
          </blockquote>
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;
