"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoginForm } from "@/app/components/auth/login-form";
import { Layout } from "@/app/components/layout/layout";
import { loginSchema, type LoginFormData } from "@/lib/validations";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Implement actual authentication logic
      console.log("Login data:", data);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For now, just redirect to home
      router.push("/");
    } catch (err) {
      setError("Invalid email or password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <LoginForm 
            onSubmit={handleLogin}
            isLoading={isLoading}
            error={error || undefined}
          />
        </div>
      </div>
    </Layout>
  );
}
