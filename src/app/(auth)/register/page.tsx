"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight, CheckCircle2, Lock, Mail, User, Eye, EyeOff,
  Shield, Check, AlertCircle, Sparkles, CheckCheck, Loader2
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { GoogleLogin } from "@react-oauth/google";

export default function RegisterPage() {
  const { register, loginWithGoogle, user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/boards");
    }
  }, [user, isLoading, router]);

  // Pre-warm the backend on register page mount
  useEffect(() => {
    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      (process.env.NODE_ENV === "production" ? "/api-proxy" : "http://localhost:8080");
    const pingUrl = backendUrl.startsWith("http") ? backendUrl : `${backendUrl}/`;
    fetch(pingUrl, { method: "HEAD", mode: "no-cors" }).catch(() => {});
  }, []);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: "", color: "" };
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1;
    if (password.length >= 12 && score === 3) score += 1;

    switch (score) {
      case 1:
        return { score: 25, label: "Weak", color: "bg-error text-error" };
      case 2:
        return { score: 50, label: "Fair", color: "bg-tertiary text-tertiary" };
      case 3:
        return { score: 75, label: "Good", color: "bg-primary text-primary" };
      case 4:
        return { score: 100, label: "Strong", color: "bg-emerald-500 text-emerald-500" };
      default:
        return { score: 0, label: "", color: "" };
    }
  }, [password]);

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);
    try {
      await register(fullName, email, password);
      toast.success("Account created successfully!", {
        description: "Welcome to TaskFlow. We're launching your workspace.",
        duration: 4000,
      });
      router.push("/boards");
    } catch {
      setError("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="w-full max-w-[460px] flex flex-col gap-6"
    >
      {/* ── Brand Header ────────────────────────────────────── */}
      <div className="flex flex-col items-center text-center gap-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary via-primary-container to-secondary/80 flex items-center justify-center text-on-primary shadow-md shadow-primary/20 mb-1">
          <Sparkles size={22} strokeWidth={2.2} />
        </div>
        <h1 className="font-[family-name:var(--font-heading)] text-[26px] font-bold text-on-surface tracking-tight">
          Create your account
        </h1>
        <p className="font-[family-name:var(--font-body)] text-[14px] text-on-surface-variant max-w-[340px] leading-relaxed">
          Join your team in TaskFlow to collaborate, organize boards, and accelerate sprint velocity.
        </p>
      </div>

      {/* ── Registration Glassmorphic Card ──────────────────── */}
      <div className="relative rounded-2xl border border-outline-variant/60 bg-surface/85 dark:bg-surface-low/85 backdrop-blur-xl shadow-xl p-6 sm:p-8 flex flex-col gap-5">

        {/* Google Sign-In */}
        <div className="w-full flex justify-center min-h-[40px] [&>div]:!w-full [&_iframe]:!w-full">
          {isGoogleLoading ? (
            <div className="w-full h-10 px-4 rounded-full border border-outline-variant/60 bg-surface-low/80 dark:bg-surface-high/60 flex items-center justify-center gap-2.5 text-on-surface-variant font-[family-name:var(--font-body)] text-[13.5px] font-medium shadow-2xs select-none">
              <Loader2 size={16} className="animate-spin text-primary shrink-0" />
              <span>Signing you in with Google…</span>
            </div>
          ) : (
            <div className="w-full rounded-full overflow-hidden">
              <GoogleLogin
                onSuccess={async (credentialResponse) => {
                  const idToken = credentialResponse.credential;
                  if (!idToken) {
                    toast.error("Google sign-in failed, please try again");
                    return;
                  }
                  setIsGoogleLoading(true);
                  try {
                    await loginWithGoogle(idToken);
                    toast.success("Welcome to TaskFlow!", { duration: 4000 });
                    router.replace("/boards");
                  } catch {
                    setIsGoogleLoading(false);
                    toast.error("Google sign-in failed, please try again");
                  }
                }}
                onError={() => {
                  setIsGoogleLoading(false);
                  toast.error("Google sign-in was unsuccessful. Please try again.");
                }}
                theme="outline"
                size="large"
                shape="pill"
                text="continue_with"
                width="100%"
              />
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-px bg-outline-variant/40 flex-1" />
          <span className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-wider text-outline">
            or register with email
          </span>
          <div className="h-px bg-outline-variant/40 flex-1" />
        </div>

        {/* Form */}
        <form className="flex flex-col gap-4" onSubmit={handleSubmit} autoComplete="off">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 p-3 rounded-xl bg-error-container/40 border border-error/25 text-error text-[13px] font-[family-name:var(--font-body)]"
            >
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Full Name */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="fullName"
              className="font-[family-name:var(--font-mono)] text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider"
            >
              Full Name
            </label>
            <div className="relative flex items-center">
              <User size={15} className="absolute left-3.5 text-outline pointer-events-none" />
              <input
                type="text"
                id="fullName"
                name="fullName"
                autoComplete="off"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading || isGoogleLoading}
                className="w-full bg-surface-lowest border border-outline-variant/70 rounded-xl pl-10 pr-3.5 py-2.5 font-[family-name:var(--font-body)] text-[13.5px] text-on-surface placeholder:text-outline/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                required
              />
            </div>
          </div>

          {/* Work Email */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="font-[family-name:var(--font-mono)] text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider"
            >
              Work Email
            </label>
            <div className="relative flex items-center">
              <Mail size={15} className="absolute left-3.5 text-outline pointer-events-none" />
              <input
                type="email"
                id="email"
                name="email"
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || isGoogleLoading}
                className="w-full bg-surface-lowest border border-outline-variant/70 rounded-xl pl-10 pr-3.5 py-2.5 font-[family-name:var(--font-body)] text-[13.5px] text-on-surface placeholder:text-outline/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="font-[family-name:var(--font-mono)] text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider"
              >
                Password
              </label>
              {passwordStrength.label && (
                <span className={cn("font-[family-name:var(--font-mono)] text-[11px] font-semibold", passwordStrength.color.split(" ")[1])}>
                  {passwordStrength.label}
                </span>
              )}
            </div>
            <div className="relative flex items-center">
              <Lock size={15} className="absolute left-3.5 text-outline pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading || isGoogleLoading}
                className="w-full bg-surface-lowest border border-outline-variant/70 rounded-xl pl-10 pr-10 py-2.5 font-[family-name:var(--font-body)] text-[13.5px] text-on-surface placeholder:text-outline/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                required
              />
              <button
                type="button"
                disabled={loading || isGoogleLoading}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 p-1 rounded-lg text-outline hover:text-on-surface transition-colors cursor-pointer disabled:opacity-50"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {/* Password strength bar */}
            {password.length > 0 && (
              <div className="w-full h-1 bg-outline-variant/40 rounded-full overflow-hidden mt-1">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${passwordStrength.score}%` }}
                  transition={{ duration: 0.25 }}
                  className={cn("h-full rounded-full transition-colors", passwordStrength.color.split(" ")[0])}
                />
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="confirmPassword"
                className="font-[family-name:var(--font-mono)] text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider"
              >
                Confirm Password
              </label>
              {confirmPassword.length > 0 && (
                <span className={cn("font-[family-name:var(--font-mono)] text-[11px] flex items-center gap-1", passwordsMatch ? "text-emerald-500 font-semibold" : "text-error")}>
                  {passwordsMatch ? (
                    <>
                      <CheckCheck size={13} />
                      <span>Matches</span>
                    </>
                  ) : (
                    <span>Does not match</span>
                  )}
                </span>
              )}
            </div>
            <div className="relative flex items-center">
              <Lock size={15} className="absolute left-3.5 text-outline pointer-events-none" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                name="confirmPassword"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading || isGoogleLoading}
                className={cn(
                  "w-full bg-surface-lowest border rounded-xl pl-10 pr-10 py-2.5 font-[family-name:var(--font-body)] text-[13.5px] text-on-surface placeholder:text-outline/60 focus:outline-none focus:ring-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed",
                  confirmPassword.length > 0 && passwordsMatch
                    ? "border-emerald-500/60 focus:border-emerald-500 focus:ring-emerald-500/20"
                    : "border-outline-variant/70 focus:border-primary focus:ring-primary/20"
                )}
                required
              />
              <button
                type="button"
                disabled={loading || isGoogleLoading}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 p-1 rounded-lg text-outline hover:text-on-surface transition-colors cursor-pointer disabled:opacity-50"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Terms text */}
          <p className="font-[family-name:var(--font-body)] text-[12px] text-outline leading-normal pt-1">
            By signing up, you agree to TaskFlow&apos;s{" "}
            <a href="#" className="text-primary hover:underline">Terms of Service</a> and{" "}
            <a href="#" className="text-primary hover:underline">Privacy Policy</a>.
          </p>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || isGoogleLoading}
            className="w-full bg-gradient-to-r from-primary to-primary-container text-on-primary font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-xl py-3 mt-1 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm shadow-primary/20 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
            ) : (
              <>
                <span>Create Workspace Account</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>

      {/* ── Footer Link ───────────────────────────────────────── */}
      <div className="text-center">
        <p className="font-[family-name:var(--font-body)] text-[13.5px] text-on-surface-variant">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-primary font-semibold hover:underline decoration-2 underline-offset-4 transition-all"
          >
            Sign in instead
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
