"use client";

import { useStore } from "@nanostores/react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { $auth, auth } from "@/state/auth";
import { AuthError, AuthShell, authLinkClass } from "./auth-shell";
import { PasswordInput } from "./password-input";

export function OnboardForm() {
  const authState = useStore($auth);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await auth.signUp();
    if (success) {
      router.push("/home");
    }
  };

  const handleInputChange =
    (field: keyof typeof authState.onboardForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      auth.handleOnboardFormChange(field, e.target.value);
    };

  const form = authState.onboardForm;
  const passwordsMatch = form.password === form.confirmPassword;
  const isFormValid =
    form.displayName &&
    form.email &&
    form.password &&
    form.confirmPassword &&
    passwordsMatch;

  return (
    <AuthShell
      title="Create your account"
      subtitle="Enter your name, email and a password."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/auth/login" className={authLinkClass}>
            Sign in
          </Link>
        </>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <AuthError message={authState.error} />

        <div className="grid gap-1.5">
          <Label htmlFor="displayName">Full name</Label>
          <Input
            id="displayName"
            type="text"
            autoComplete="name"
            placeholder="Jane Doe"
            className="h-9"
            required
            value={form.displayName}
            onChange={handleInputChange("displayName")}
            disabled={authState.isLoading}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="h-9"
            required
            value={form.email}
            onChange={handleInputChange("email")}
            disabled={authState.isLoading}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            required
            value={form.password}
            onChange={handleInputChange("password")}
            disabled={authState.isLoading}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="confirm-password">Confirm password</Label>
          <PasswordInput
            id="confirm-password"
            autoComplete="new-password"
            required
            value={form.confirmPassword}
            onChange={handleInputChange("confirmPassword")}
            disabled={authState.isLoading}
            aria-invalid={!passwordsMatch && !!form.confirmPassword}
          />
          {!passwordsMatch && form.confirmPassword && (
            <p className="text-xs text-destructive">Passwords do not match</p>
          )}
        </div>

        <Button
          type="submit"
          size="lg"
          className="mt-1 w-full"
          disabled={!isFormValid || authState.isLoading}
        >
          {authState.isLoading && <Loader2 className="animate-spin" />}
          {authState.isLoading ? "Creating account..." : "Create account"}
        </Button>
      </form>
    </AuthShell>
  );
}
