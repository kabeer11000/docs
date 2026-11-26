"use client";

import { useStore } from "@nanostores/react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { $auth, auth } from "@/state/auth";
import { AuthError, AuthShell, authLinkClass } from "./auth-shell";
import { PasswordInput } from "./password-input";

export function LoginForm() {
  const authState = useStore($auth);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await auth.login();
    if (success) {
      const redirectTo = searchParams.get("redirect") || "/home";
      router.push(redirectTo);
    }
  };

  const handleInputChange =
    (field: keyof typeof authState.loginForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      auth.handleLoginFormChange(field, e.target.value);
    };

  return (
    <AuthShell
      title="Sign in"
      subtitle="Use your email and password to continue."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/auth/onboard" className={authLinkClass}>
            Sign up
          </Link>
        </>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <AuthError message={authState.error} />

        <div className="grid gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="h-9"
            required
            value={authState.loginForm.email}
            onChange={handleInputChange("email")}
            disabled={authState.isLoading}
          />
        </div>
        <div className="grid gap-1.5">
          <div className="flex items-center">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/auth/forgot-password"
              className="ml-auto text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            required
            value={authState.loginForm.password}
            onChange={handleInputChange("password")}
            disabled={authState.isLoading}
          />
        </div>
        <Button
          type="submit"
          size="lg"
          className="mt-1 w-full"
          disabled={
            authState.isLoading ||
            !authState.loginForm.email ||
            !authState.loginForm.password
          }
        >
          {authState.isLoading && <Loader2 className="animate-spin" />}
          {authState.isLoading ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </AuthShell>
  );
}
