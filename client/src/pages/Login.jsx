import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { VITE_API_URL } from "@/config/env";
import { isValidEmail } from "@/utils/validators";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/Card";
import logoImg from "@/assets/logo.png";
import { Loader } from "@/components/ui/Loader";

export function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [touched, setTouched] = useState({ email: false });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const emailValid = isValidEmail(formData.email);
  const showEmailError = touched.email && formData.email.length > 0 && !emailValid;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrorMessage("");
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!emailValid || !formData.password) {
      setErrorMessage("Please enter a valid email and password.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(`${VITE_API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to log in.");
      }

      localStorage.setItem("token", data.token);
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setErrorMessage(err.message || "Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-text-primary flex items-center justify-center p-4 transition-colors">
      <Card className="w-full max-w-md bg-surface-card border border-border hover:border-accent/40 transition-all duration-300 shadow-2xl">
        <CardHeader className="space-y-2 text-center">
          <img src={logoImg} alt="Techwiz GenAI" className="w-12 h-12 object-contain mx-auto" />
          <CardTitle className="text-2xl font-bold tracking-tight text-text-primary">
            Welcome back
          </CardTitle>
          <CardDescription className="text-text-muted">
            Sign in to your Techwiz GenAI account
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {errorMessage && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/50 text-red-300 text-xs">
                {errorMessage}
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">Email address</label>
              <Input
                name="email"
                type="email"
                placeholder="name@example.com"
                value={formData.email}
                onChange={handleChange}
                onBlur={() => handleBlur("email")}
                required
                className={showEmailError ? "border-red-500/80 focus-visible:ring-red-500/50" : ""}
              />
              {showEmailError && (
                <p className="text-[11px] text-red-400">Please provide a valid email address.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">Password</label>
              <Input
                name="password"
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 pt-2">
            <Button
              type="submit"
              disabled={loading || !formData.email || !formData.password}
              className="w-full flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading && <Loader size={14} className="text-white" />}
              <span>{loading ? "Signing in..." : "Sign in"}</span>
            </Button>
            <p className="text-xs text-zinc-400 text-center">
              Don&apos;t have an account?{" "}
              <Link to="/register" className="text-blue-400 hover:text-blue-300 underline font-medium">
                Create account
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default Login;
