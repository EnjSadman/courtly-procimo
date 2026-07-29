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
  const backendLoginUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  return (
    <SignInUpContainer>
      <h2 className="text-2xl font-bold text-background">Sign in</h2>
      <form
        action={`${backendLoginUrl}/auth/login`}
        method="post"
        className="w-full space-y-4"
      >
        <InputGroup className={inputGroupClassName}>
          <InputGroupAddon>
            <Mail size={16} className="text-background" />
          </InputGroupAddon>
          <InputGroupInput
            id="email"
            name="email"
            type="email"
            placeholder="Email"
          />
        </InputGroup>
        <InputGroup className={inputGroupClassName}>
          <InputGroupAddon>
            <Lock size={16} className="text-background" />
          </InputGroupAddon>
          <InputGroupInput
            id="password"
            name="password"
            type="password"
            placeholder="Password"
          />
        </InputGroup>
        <InputGroup className="gap-2">
            <InputGroupAddon>
                <Checkbox id="remember" />
            </InputGroupAddon>
            <span className="text-sm text-background/50">
                Remember me
            </span>
        </InputGroup>
        <Button type="submit" className="w-full">
          Sign in
        </Button>
        <div>
            <span className="text-sm text-background/50">
                Don&apos;t have an account?
            </span>
            {" "}
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
