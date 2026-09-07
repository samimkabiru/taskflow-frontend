"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, CheckCircle2, Lock, Mail, Eye, EyeOff,
  AlertCircle, KeyRound, Check, Loader2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { GoogleLogin } from "@react-oauth/google";

export default function LoginPage() {
  const { login, loginWithGoogle, user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/boards");
    }
  }, [user, isLoading, router]);

  // Pre-warm the backend on login page mount: fire-and-forget HEAD request so Render cold start
  // begins while user is still choosing a sign-in method
  useEffect(() => {
    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      (process.env.NODE_ENV === "production" ? "/api-proxy" : "http://localhost:8080");
    const pingUrl = backendUrl.startsWith("http") ? backendUrl : `${backendUrl}/`;
    fetch(pingUrl, { method: "HEAD", mode: "no-cors" }).catch(() => {});
  }, []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      toast.success("Welcome back to TaskFlow!", { duration: 4000 });
      router.push("/boards");
    } catch {
      setError("Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotSent(true);
    toast.success("Reset link sent!", {
      description: `We've sent a password reset link to ${forgotEmail}`,
    });
    setTimeout(() => {
      setShowForgotModal(false);
      setForgotSent(false);
      setForgotEmail("");
    }, 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="w-full max-w-[440px] flex flex-col gap-6"
    >
      {/* ── Brand Header ────────────────────────────────────── */}
      <div className="flex flex-col items-center text-center gap-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary via-primary-container to-primary/80 flex items-center justify-center text-on-primary shadow-md shadow-primary/20 mb-1">
          <CheckCircle2 size={24} strokeWidth={2.5} />
        </div>
        <h1 className="font-[family-name:var(--font-heading)] text-[26px] font-bold text-on-surface tracking-tight">
          Welcome back
        </h1>
        <p className="font-[family-name:var(--font-body)] text-[14px] text-on-surface-variant max-w-[320px] leading-relaxed">
          Sign in to your workspace to continue managing your boards and high-velocity tasks.
        </p>
      </div>

      {/* ── Login Glassmorphic Card ─────────────────────────── */}
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
                    toast.success("Welcome back to TaskFlow!", { duration: 4000 });
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
            or sign in with email
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

          {/* Email field */}
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

          {/* Password field */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="font-[family-name:var(--font-mono)] text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider"
              >
                Password
              </label>
              <button
                type="button"
                disabled={loading || isGoogleLoading}
                onClick={() => setShowForgotModal(true)}
                className="font-[family-name:var(--font-body)] text-[12px] font-medium text-primary hover:underline transition-all cursor-pointer disabled:opacity-50"
              >
                Forgot password?
              </button>
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
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || isGoogleLoading}
            className="w-full bg-gradient-to-r from-primary to-primary-container text-on-primary font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-xl py-3 mt-2 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm shadow-primary/20 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In to Workspace</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>

      {/* ── Footer Link ───────────────────────────────────────── */}
      <div className="text-center">
        <p className="font-[family-name:var(--font-body)] text-[13.5px] text-on-surface-variant">
          Don&apos;t have an account yet?{" "}
          <Link
            href="/register"
            className="text-primary font-semibold hover:underline decoration-2 underline-offset-4 transition-all"
          >
            Create an account
          </Link>
        </p>
      </div>

      {/* ── Forgot Password Dialog Modal ──────────────────────── */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-md bg-surface border border-outline-variant/60 rounded-2xl p-6 shadow-2xl flex flex-col gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <KeyRound size={20} />
                </div>
                <div>
                  <h3 className="font-[family-name:var(--font-heading)] font-semibold text-[17px] text-on-surface">
                    Reset Password
                  </h3>
                  <p className="font-[family-name:var(--font-body)] text-[12.5px] text-on-surface-variant">
                    Enter your email to receive recovery instructions.
                  </p>
                </div>
              </div>

              {forgotSent ? (
                <div className="flex items-center gap-2 p-3.5 rounded-xl bg-secondary/15 border border-secondary/30 text-secondary text-[13px] font-[family-name:var(--font-body)]">
                  <Check size={16} className="shrink-0" />
                  <span>Reset link dispatched. Please check your inbox.</span>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="flex flex-col gap-3">
                  <div className="relative flex items-center">
                    <Mail size={15} className="absolute left-3 text-outline pointer-events-none" />
                    <input
                      type="email"
                      placeholder="name@company.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full bg-surface-low border border-outline-variant rounded-xl pl-9 pr-3 py-2 font-[family-name:var(--font-body)] text-[13px] text-on-surface placeholder:text-outline focus:outline-none focus:border-primary"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="px-3.5 py-1.5 rounded-xl text-[12.5px] font-medium text-on-surface-variant hover:bg-surface-high transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-primary text-on-primary text-[12.5px] font-semibold hover:brightness-110 transition-all cursor-pointer shadow-xs"
                    >
                      Send Reset Link
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
