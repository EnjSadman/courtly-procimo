"use client";

import { useState } from "react";
import { SignInUpContainer } from "@/components/common/forms/SignInUpContainer";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Lock, Mail } from "lucide-react";
import Link from "next/link";

export function SignUpForm() {
  const inputGroupClassName = "h-10 w-full border-background/10";
  const backendApiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const trimmedEmail = email.trim();

  function getResponseErrorMessage(responseBody: unknown) {
    if (!responseBody || typeof responseBody !== "object") {
      return null;
    }

    const { errors, message } = responseBody as {
      errors?: unknown;
      message?: unknown;
    };

    if (Array.isArray(errors)) {
      const readableErrors = errors.filter(
        (error): error is string =>
          typeof error === "string" && error.length > 0,
      );

      if (readableErrors.length > 0) {
        return readableErrors.join(" ");
      }
    }

    return typeof message === "string" ? message : null;
  }

  function getClientValidationError() {
    if (!trimmedEmail.includes("@")) {
      return "Please enter a valid email address.";
    }

    if (password.trim().length < 8) {
      return "Password must be at least 8 characters long.";
    }

    if (password !== confirmPassword) {
      return "Passwords do not match.";
    }

    return null;
  }

  async function submitRegistration(nextEmail: string, nextPassword: string) {
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch(`${backendApiUrl}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: nextEmail,
          password: nextPassword,
        }),
      });

      const contentType = response.headers.get("content-type") || "";
      const responseBody = contentType.includes("application/json")
        ? await response.json()
        : null;

      if (!response.ok) {
        setErrorMessage(
          getResponseErrorMessage(responseBody) || "Sign up failed.",
        );
        return;
      }

      if (responseBody?.redirect) {
        window.location.assign(responseBody.redirect);
        return;
      }

      setErrorMessage("Sign up succeeded, but no redirect was returned.");
    } catch {
      setErrorMessage("Unable to reach the server.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = getClientValidationError();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    await submitRegistration(trimmedEmail, password);
  }

  const isFormIncomplete =
    !email.trim() || !password.trim() || !confirmPassword.trim();

  return (
    <SignInUpContainer>
      <h2 className="text-2xl font-bold text-background">Sign up</h2>
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
            onChange={(event) => {
              setEmail(event.target.value);
              setErrorMessage("");
            }}
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
            onChange={(event) => {
              setPassword(event.target.value);
              setErrorMessage("");
            }}
            autoComplete="new-password"
            aria-invalid={Boolean(errorMessage)}
            disabled={isSubmitting}
          />
        </InputGroup>
        <label htmlFor="confirm-password" className="sr-only">
          Confirm password
        </label>
        <InputGroup className={inputGroupClassName}>
          <InputGroupAddon>
            <Lock size={16} className="text-background" />
          </InputGroupAddon>
          <InputGroupInput
            id="confirm-password"
            name="confirmPassword"
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              setErrorMessage("");
            }}
            autoComplete="new-password"
            aria-invalid={Boolean(errorMessage)}
            disabled={isSubmitting}
          />
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
          {isSubmitting ? "Signing up..." : "Sign up"}
        </Button>
        <div>
          <span className="text-sm text-background/50">
            Already have an account?
          </span>{" "}
          <Link
            href="/sign-in"
            className="text-sm text-background/50 underline hover:text-background"
          >
            Sign in
          </Link>
        </div>
      </form>
    </SignInUpContainer>
  );
}
