import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Anmelden – Postradamus",
};

type LoginPageProps = {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, message, next } = await searchParams;

  return <LoginForm initialError={error} initialMessage={message} next={next} />;
}
