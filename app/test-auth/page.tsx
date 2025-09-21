"use client";

import { useAuth } from "@/app/contexts/auth-context";
import { Layout } from "@/app/components/layout/layout";

export default function TestAuthPage() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-8">
          <div className="text-center">Loading authentication...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Authentication Test</h1>
          
          <div className="space-y-4">
            <div>
              <strong>Authenticated:</strong> {isAuthenticated ? "Yes" : "No"}
            </div>
            
            {user && (
              <div>
                <strong>User ID:</strong> {user.id}
              </div>
            )}
            
            {user && (
              <div>
                <strong>Email:</strong> {user.email}
              </div>
            )}
            
            {user && (
              <div>
                <strong>Name:</strong> {user.name}
              </div>
            )}
            
            <div>
              <strong>Created At:</strong> {user?.createdAt?.toISOString()}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
