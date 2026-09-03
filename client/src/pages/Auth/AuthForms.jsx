import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Loader } from "@/components/ui/Loader";
import { useToast } from "@/context/ToastContext";
import { VITE_API_URL } from "@/config/env";
import { ComingSoonModal } from "@/components/ui/ComingSoonModal";
import { SignUpForm } from "./SignUpForm";

export { PasswordInput, SignUpForm };

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${VITE_API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to sign in");
      }
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      toast.success("Welcome back to Techwiz GenAI");
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignIn} autoComplete="on" className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-1.5 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Sign in to your account</h1>
        <p className="text-sm text-muted-foreground">Enter your email below to sign in</p>
      </div>

      {error && (
        <div className="p-2.5 rounded-[var(--radius-sm)] bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs">
          {error}
        </div>
      )}

      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="signin-email">Email</Label>
          <Input
            id="signin-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            required
            autoComplete="email"
          />
        </div>
        <PasswordInput
          id="signin-password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          placeholder="Password"
        />
        <Button type="submit" variant="default" disabled={loading} className="mt-2 w-full">
          {loading ? <Loader size={14} className="text-white" /> : "Sign In"}
        </Button>
      </div>
    </form>
  );
}

export function AuthFormContainer({ isSignIn, onToggle }) {
  const [isComingSoonOpen, setIsComingSoonOpen] = useState(false);

  return (
    <div className="mx-auto grid w-full max-w-[360px] gap-3">
      {isSignIn ? <SignInForm /> : <SignUpForm />}
      <div className="text-center text-xs text-muted-foreground">
        {isSignIn ? "Don't have an account?" : "Already have an account?"}{" "}
        <Button variant="link" className="p-0 h-auto font-medium text-foreground hover:underline" onClick={onToggle}>
          {isSignIn ? "Sign up" : "Sign in"}
        </Button>
      </div>
      <div className="relative text-center text-xs after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border my-1">
        <span className="relative z-10 bg-background px-2 text-muted-foreground">Or continue with</span>
      </div>
      <Button variant="outline" type="button" onClick={() => setIsComingSoonOpen(true)} className="w-full cursor-pointer">
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
          <path
            fill="#EA4335"
            d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
          />
          <path
            fill="#4285F4"
            d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
          />
          <path
            fill="#FBBC05"
            d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 12s.7 2.3 1.9 4.7l3.7-1.9z"
          />
          <path
            fill="#34A853"
            d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
          />
        </svg>
        Continue with Google
      </Button>

      <ComingSoonModal
        isOpen={isComingSoonOpen}
        onClose={() => setIsComingSoonOpen(false)}
        title="Google Sign-In"
        description="Google Authentication is currently undergoing OAuth 2.0 verification and will be available in the next release."
      />
    </div>
  );
}

export default AuthFormContainer;
