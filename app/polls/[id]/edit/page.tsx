"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CreatePollForm } from "@/app/components/polls/create-poll-form";
import { Layout } from "@/app/components/layout/layout";
import { createPollSchema, type CreatePollFormData } from "@/lib/validations";
import { useAuth } from "@/app/contexts/auth-context";
import { Poll } from "@/types";

export default function EditPollPage({ params }: { params: Promise<{ id: string }> }) {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  // Fetch poll data
  useEffect(() => {
    const fetchPoll = async () => {
      try {
        const { id } = await params;
        const response = await fetch(`/api/polls/${id}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch poll');
        }
        
        const data = await response.json();
        setPoll(data.poll);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch poll');
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchPoll();
    }
  }, [isAuthenticated, params]);

  // Check if user owns the poll
  useEffect(() => {
    if (poll && user && poll.created_by !== user.id) {
      setError("You can only edit your own polls");
    }
  }, [poll, user]);

  const handleUpdatePoll = async (data: CreatePollFormData) => {
    if (!poll || !isAuthenticated) {
      setError("You must be logged in to edit a poll");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/polls/${poll.id}`, {
        method: "PUT",
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
        throw new Error(errorData.error || "Failed to update poll");
      }

      const result = await response.json();
      console.log("Poll updated successfully:", result);
      
      // Show success message
      setSuccess("Poll updated successfully! Redirecting to polls...");
      
      // Redirect to polls page after a short delay
      setTimeout(() => {
        router.push("/polls");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update poll. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading while checking authentication
  if (authLoading || isLoading) {
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
                You must be logged in to edit a poll.
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

  // Show error if poll not found or user doesn't own it
  if (error && !poll) {
    return (
      <Layout>
        <div className="container py-8">
          <div className="max-w-2xl mx-auto">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Error</h1>
              <p className="text-muted-foreground mb-4">{error}</p>
              <button
                onClick={() => router.push("/polls")}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-md"
              >
                Back to Polls
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Transform poll data to form data
  const formData: CreatePollFormData = {
    title: poll?.question || "",
    description: poll?.description || "",
    options: poll?.options.map(option => option.text) || ["", ""],
    isPublic: poll?.is_public ?? true,
    allowMultipleVotes: poll?.allow_multiple_votes ?? false,
    expiresAt: poll?.expires_at ? new Date(poll.expires_at) : undefined,
  };

  return (
    <Layout>
      <div className="container py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Edit Poll</h1>
            <p className="text-muted-foreground">Update your poll details</p>
          </div>
          
          <CreatePollForm 
            onSubmit={handleUpdatePoll}
            isLoading={isSubmitting}
            error={error}
            success={success}
            defaultValues={formData}
          />
        </div>
      </div>
    </Layout>
  );
}
