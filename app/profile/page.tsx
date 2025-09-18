"use client";

import { useState } from "react";
import { ProfileForm } from "@/app/components/auth/profile-form";
import { Layout } from "@/app/components/layout/layout";
import { updateProfileSchema, type UpdateProfileFormData } from "@/lib/validations";
import { User } from "@/types";

// Mock user data - replace with actual user from context/state
const mockUser: User = {
  id: "1",
  email: "user@example.com",
  name: "John Doe",
  avatar: "",
  createdAt: new Date(),
  updatedAt: new Date(),
};

export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpdateProfile = async (data: UpdateProfileFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Implement actual profile update logic
      console.log("Update profile data:", data);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show success message or redirect
      console.log("Profile updated successfully");
    } catch (err) {
      setError("Failed to update profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout user={mockUser}>
      <div className="container py-8">
        <div className="max-w-2xl mx-auto">
          <ProfileForm 
            user={mockUser}
            onSubmit={handleUpdateProfile}
            isLoading={isLoading}
            error={error || undefined}
          />
        </div>
      </div>
    </Layout>
  );
}
