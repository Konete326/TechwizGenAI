import { useState } from "react";
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

export function AuthLayout({ defaultIsSignIn = true }) {
  const [isSignIn, setIsSignIn] = useState(defaultIsSignIn);
  const toggleForm = () => setIsSignIn((prev) => !prev);

  const currentContent = isSignIn ? defaultSignInContent : defaultSignUpContent;

  return (
    <div className="w-full min-h-screen md:grid md:grid-cols-2 bg-background overflow-y-auto">
      <div
        className={clsx(
          "flex min-h-screen items-center justify-center p-6 md:p-12 transition-all duration-300",
          !isSignIn && "md:order-last"
        )}
      >
        <div
          key={isSignIn ? "signin" : "signup"}
          className="w-full max-w-[360px] animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-300 ease-out"
        >
          <AuthFormContainer isSignIn={isSignIn} onToggle={toggleForm} />
        </div>
      </div>

      <div
        className="hidden md:block relative bg-cover bg-center transition-all duration-500 ease-in-out border-border overflow-hidden"
        key={currentContent.image.src}
      >
        <img
          src={currentContent.image.src}
          alt={currentContent.image.alt}
          className="absolute inset-0 h-full w-full object-cover pointer-events-none select-none"
        />
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
        <div className="absolute inset-x-0 bottom-0 h-[150px] bg-gradient-to-t from-background to-transparent" />

        <div className="relative z-10 flex h-full flex-col items-center justify-end p-6 pb-12">
          <blockquote className="space-y-2 text-center text-foreground max-w-md bg-background/60 p-5 rounded-[var(--radius-md)] border border-border/60 backdrop-blur-md">
            <p className="text-base font-semibold tracking-tight text-white">
              "<Typewriter
                key={currentContent.quote.text}
                text={currentContent.quote.text}
                speed={50}
              />"
            </p>
            <cite className="block text-xs font-mono text-zinc-300 not-italic">
              - {currentContent.quote.author}
            </cite>
          </blockquote>
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;
