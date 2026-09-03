import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Loader } from "@/components/ui/Loader";
import { useToast } from "@/context/ToastContext";
import { VITE_API_URL } from "@/config/env";

export function SignUpForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${VITE_API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to create account");
      }
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      toast.success("Account created successfully");
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignUp} autoComplete="on" className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-1.5 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Create an account</h1>
        <p className="text-sm text-muted-foreground">Enter your details below to sign up</p>
      </div>

      {error && (
        <div className="p-2.5 rounded-[var(--radius-sm)] bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs">
          {error}
        </div>
      )}

      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="signup-name">Full Name</Label>
          <Input
            id="signup-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            required
            autoComplete="name"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="signup-email">Email</Label>
          <Input
            id="signup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            required
            autoComplete="email"
          />
        </div>
        <PasswordInput
          id="signup-password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
          placeholder="Password"
        />
        <Button type="submit" variant="default" disabled={loading} className="mt-2 w-full">
          {loading ? <Loader size={14} className="text-white" /> : "Sign Up"}
        </Button>
      </div>
    </form>
  );
}

export default SignUpForm;
