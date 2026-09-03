import { useState } from "react";
import { clsx } from "clsx";
import { Typewriter } from "@/components/ui/Typewriter";
import { AuthFormContainer } from "./AuthForms";

const defaultSignInContent = {
  image: {
    src: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop",
    alt: "High performance AI computing architecture"
  },
  quote: {
    text: "Welcome Back! The journey continues.",
    author: "Techwiz GenAI"
  }
};

const defaultSignUpContent = {
  image: {
    src: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1200&auto=format&fit=crop",
    alt: "Vibrant creative digital art studio"
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
        className="hidden md:block relative bg-cover bg-center transition-all duration-500 ease-in-out border-border"
        style={{ backgroundImage: `url(${currentContent.image.src})` }}
        key={currentContent.image.src}
      >
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
