"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CreatePollForm } from "@/app/components/polls/create-poll-form";
import { Layout } from "@/app/components/layout/layout";
import { createPollSchema, type CreatePollFormData } from "@/lib/validations";
import { useAuth } from "@/app/contexts/auth-context";

export default function CreatePollPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/auth/login");
    }
  }, [isAuthenticated, authLoading, router]);

  const handleCreatePoll = async (data: CreatePollFormData) => {
    if (!isAuthenticated) {
      setError("You must be logged in to create a poll");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/polls", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: data.title,
          options: data.options,
          is_public: data.isPublic,
          allow_multiple_votes: data.allowMultipleVotes,
          expires_at: data.expiresAt?.toISOString(),
          description: data.description,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create poll");
      }

      const result = await response.json();
      console.log("Poll created successfully:", result);
      
      // Show success message
      setSuccess("Poll created successfully! Redirecting to polls...");
      
      // Redirect to polls page after a short delay
      setTimeout(() => {
        router.push("/polls");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create poll. Please try again.");
    } finally {
      setIsLoading(false);
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
            error={error}
            success={success}
          />
        </div>
      </div>
    </Layout>
  );
}
