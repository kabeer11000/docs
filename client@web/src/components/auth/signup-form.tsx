"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useStore } from "@nanostores/react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { $auth, auth } from "@/state/auth";
import { AuthError, AuthShell, authLinkClass } from "./auth-shell";
import { PasswordInput } from "./password-input";

export function SignupForm() {
  const authState = useStore($auth);
  const router = useRouter();

  const formSchema = z
    .object({
      tenant_id: z.string(),
      displayName: z.string().min(1, { message: "Full name is required" }),
      email: z.string().email({ message: "Please enter a valid email" }),
      password: z
        .string()
        .min(8, { message: "Password must be at least 8 characters" }),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
      tenant_id: '1234', // lexa-s users
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    auth.handleOnboardFormChange("displayName", values.displayName);
    auth.handleOnboardFormChange("email", values.email);
    auth.handleOnboardFormChange("password", values.password);
    auth.handleOnboardFormChange("confirmPassword", values.confirmPassword);
    auth.handleOnboardFormChange("tenant_id", values.tenant_id);
    const success = await auth.signUp();
    if (success) {
      router.push("/home");
    }
  };

  const field = (
    name: "displayName" | "email" | "password" | "confirmPassword",
    label: string,
    input: (f: React.ComponentProps<"input">) => React.ReactNode,
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field: f }) => (
        <FormItem className="space-y-1.5">
          <FormLabel>{label}</FormLabel>
          <FormControl>{input({ ...f, disabled: authState.isLoading })}</FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

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
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <AuthError message={authState.error} />
          {field("displayName", "Full name", (f) => (
            <Input placeholder="Jane Doe" autoComplete="name" className="h-9" {...f} />
          ))}
          {field("email", "Email", (f) => (
            <Input
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              className="h-9"
              {...f}
            />
          ))}
          {field("password", "Password", (f) => (
            <PasswordInput autoComplete="new-password" {...f} />
          ))}
          {field("confirmPassword", "Confirm password", (f) => (
            <PasswordInput autoComplete="new-password" {...f} />
          ))}
          <Button
            type="submit"
            size="lg"
            className="mt-1 w-full"
            disabled={authState.isLoading}
          >
            {authState.isLoading && <Loader2 className="animate-spin" />}
            {authState.isLoading ? "Creating account..." : "Create account"}
          </Button>
        </form>
      </Form>
    </AuthShell>
  );
}
