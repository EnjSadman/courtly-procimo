"use client";

import { useState } from "react";
import { SignInUpContainer } from "@/components/common/forms/SignInUpContainer";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Lock, Mail } from "lucide-react";
import Link from "next/link";

export function SignInForm() {
  const inputGroupClassName = "h-10 w-full border-background/10";
  const backendApiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitCredentials(nextEmail: string, nextPassword: string) {
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch(`${backendApiUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: nextEmail,
          password: nextPassword,
          rememberMe,
        }),
      });

      const contentType = response.headers.get("content-type") || "";
      const responseBody = contentType.includes("application/json")
        ? await response.json()
        : null;

      if (!response.ok) {
        setErrorMessage(responseBody?.message || "Sign in failed.");
        return;
      }

      if (responseBody?.redirect) {
        window.location.assign(responseBody.redirect);
        return;
      }

      setErrorMessage("Sign in succeeded, but no redirect was returned.");
    } catch {
      setErrorMessage("Unable to reach the server.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitCredentials(email, password);
  }

  const isFormIncomplete = !email.trim() || !password.trim();

  return (
    <SignInUpContainer>
      <h2 className="text-2xl font-bold text-background">Sign in</h2>
      <form
        onSubmit={handleSubmit}
        className="w-full space-y-4"
        autoComplete="on"
      >
        <label htmlFor="email" className="sr-only">
          Email
        </label>
        <InputGroup className={inputGroupClassName}>
          <InputGroupAddon>
            <Mail size={16} className="text-background" />
          </InputGroupAddon>
          <InputGroupInput
            id="email"
            name="email"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            aria-invalid={Boolean(errorMessage)}
            disabled={isSubmitting}
          />
        </InputGroup>
        <label htmlFor="password" className="sr-only">
          Password
        </label>
        <InputGroup className={inputGroupClassName}>
          <InputGroupAddon>
            <Lock size={16} className="text-background" />
          </InputGroupAddon>
          <InputGroupInput
            id="password"
            name="password"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            aria-invalid={Boolean(errorMessage)}
            disabled={isSubmitting}
          />
        </InputGroup>
        <InputGroup className="gap-2">
          <InputGroupAddon>
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(Boolean(checked))}
              disabled={isSubmitting}
            />
          </InputGroupAddon>
          <label htmlFor="remember" className="text-sm text-background/50">
            Remember me
          </label>
        </InputGroup>
        {errorMessage ? (
          <p className="text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting || isFormIncomplete}
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </Button>
        <div>
          <span className="text-sm text-background/50">
            Don&apos;t have an account?
          </span>{" "}
          <Link
            href="/sign-up"
            className="text-sm text-background/50 underline hover:text-background"
          >
            Sign up
          </Link>
        </div>
      </form>
    </SignInUpContainer>
  );
}
