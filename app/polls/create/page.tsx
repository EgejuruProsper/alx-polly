"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreatePollForm } from "@/app/components/polls/create-poll-form";
import { Layout } from "@/app/components/layout/layout";
import { createPollSchema, type CreatePollFormData } from "@/lib/validations";

export default function CreatePollPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleCreatePoll = async (data: CreatePollFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Implement actual poll creation logic
      console.log("Creating poll with data:", data);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // For now, just redirect to polls page
      router.push("/polls");
    } catch (err) {
      setError("Failed to create poll. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container py-8">
        <div className="max-w-2xl mx-auto">
          <CreatePollForm 
            onSubmit={handleCreatePoll}
            isLoading={isLoading}
            error={error}
          />
        </div>
      </div>
    </Layout>
  );
}
