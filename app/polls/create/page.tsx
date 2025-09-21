"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CreatePollForm } from "@/app/components/polls/create-poll-form";
import { Layout } from "@/app/components/layout/layout";
import { type CreatePollFormData } from "@/lib/validations";
import { useAuth } from "@/app/contexts/auth-context";
import { usePollActions } from "@/app/hooks/use-poll-actions";

export default function CreatePollPage() {
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { createPoll, isLoading, error, clearError } = usePollActions();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/auth/login");
    }
  }, [isAuthenticated, authLoading, router]);

  const handleCreatePoll = async (data: CreatePollFormData) => {
    if (!isAuthenticated) {
      return;
    }

    clearError();
    setSuccess(null);

    const success = await createPoll(data);

    if (success) {
      setSuccess("Poll created successfully! Redirecting to polls...");
      
      // Redirect to polls page after a short delay
      setTimeout(() => {
        router.push("/polls");
      }, 2000);
    }
  };

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <Layout>
        <div className="container py-8">
          <div className="max-w-2xl mx-auto">
            <div className="text-center">Loading...</div>
          </div>
        </div>
      </Layout>
    );
  }

  // Show message if not authenticated
  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="container py-8">
          <div className="max-w-2xl mx-auto">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
              <p className="text-muted-foreground mb-4">
                You must be logged in to create a poll.
              </p>
              <button
                onClick={() => router.push("/auth/login")}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-md"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8">
        <div className="max-w-2xl mx-auto">
          <CreatePollForm 
            onSubmit={handleCreatePoll}
            isLoading={isLoading}
            error={error || undefined}
            success={success || undefined}
          />
        </div>
      </div>
    </Layout>
  );
}
