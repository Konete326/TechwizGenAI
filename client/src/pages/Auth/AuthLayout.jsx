import { useLocation, useNavigate } from "react-router-dom";
import { clsx } from "clsx";
import { Typewriter } from "@/components/ui/Typewriter";
import { AuthFormContainer } from "./AuthForms";

const signInQuotes = [
  "Welcome back to Techwiz GenAI - transform your vision into intelligent reality.",
  "Continue crafting with autonomous AI avatars and real-time video intelligence.",
  "Resume your creative workflow across multimodal AI studios and neural engines.",
  "Empowering enterprise teams with automated documents and real-time generation.",
  "Your generative AI command center is ready - build the future today."
];

const signUpQuotes = [
  "Join Techwiz GenAI - unlock the next generation of multimodal intelligence.",
  "Step into the future with real-time Nesa AI video calling and live avatars.",
  "Generate professional documents, audio, and visual assets seamlessly.",
  "Experience an all-in-one AI ecosystem built for modern creators and teams.",
  "Transform how you create, automate, and collaborate with intelligent agents."
];

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
          src="/signin.gif"
          alt="Sign in animation"
          className={clsx(
            "absolute inset-0 h-full w-full object-cover pointer-events-none select-none transition-opacity duration-700 ease-in-out",
            isSignIn ? "opacity-100 z-[1]" : "opacity-0 z-0"
          )}
        />
        <img
          src="/signup.gif"
          alt="Sign up animation"
          className={clsx(
            "absolute inset-0 h-full w-full object-cover pointer-events-none select-none transition-opacity duration-700 ease-in-out",
            !isSignIn ? "opacity-100 z-[1]" : "opacity-0 z-0"
          )}
        />
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] z-[2]" />
        <div className="absolute inset-x-0 bottom-0 h-[220px] bg-gradient-to-t from-background via-background/60 to-transparent z-[2]" />

        <div className="relative z-10 flex h-full flex-col items-center justify-end p-8 pb-14 text-center select-none">
          <div className="max-w-md space-y-3">
            <p className="text-base md:text-lg font-medium tracking-tight text-white leading-relaxed drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] min-h-[4.5rem] flex items-center justify-center">
              "<Typewriter
                key={isSignIn ? "signin-quotes" : "signup-quotes"}
                text={isSignIn ? signInQuotes : signUpQuotes}
                loop={true}
                random={true}
                speed={40}
                deleteSpeed={20}
                delay={2500}
              />"
            </p>
            <p className="text-xs font-mono text-zinc-400 uppercase tracking-widest drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
              - Techwiz GenAI
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;
