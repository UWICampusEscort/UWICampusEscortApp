import { LoginForm } from "@/components/login-form";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 pt-0">
      <div className="w-full max-w-6xl flex items-center justify-center">
        <LoginForm />
      </div>
    </div>
  );
}
