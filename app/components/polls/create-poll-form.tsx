"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { Badge } from "@/app/components/ui/badge";
import { createPollSchema, type CreatePollFormData } from "@/lib/validations";
import { Plus, X } from "lucide-react";

interface CreatePollFormProps {
  onSubmit: (data: CreatePollFormData) => Promise<void>;
  isLoading?: boolean;
  error?: string;
}

export function CreatePollForm({ onSubmit, isLoading = false, error }: CreatePollFormProps) {
  const [newOption, setNewOption] = useState("");

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    watch,
    setValue,
  } = useForm<CreatePollFormData>({
    // resolver: zodResolver(createPollSchema),
    defaultValues: {
      title: "",
      description: "",
      options: ["", ""],
      isPublic: true,
      allowMultipleVotes: false,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "options",
  });

  const addOption = () => {
    if (newOption.trim() && fields.length < 10) {
      append(newOption.trim());
      setNewOption("");
    }
  };

  const removeOption = (index: number) => {
    if (fields.length > 2) {
      remove(index);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Create New Poll</CardTitle>
        <CardDescription>
          Create a poll to gather opinions and insights from your audience
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Poll Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Poll Title *</Label>
            <Input
              id="title"
              placeholder="What's your poll about?"
              {...register("title")}
              disabled={isLoading}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Poll Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Add more context about your poll..."
              rows={3}
              {...register("description")}
              disabled={isLoading}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Poll Options */}
          <div className="space-y-4">
            <Label>Poll Options *</Label>
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center space-x-2">
                  <Input
                    placeholder={`Option ${index + 1}`}
                    {...register(`options.${index}`)}
                    disabled={isLoading}
                  />
                  {fields.length > 2 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeOption(index)}
                      disabled={isLoading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            
            {/* Add new option */}
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Add new option"
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                disabled={isLoading || fields.length >= 10}
              />
              <Button
                type="button"
                variant="outline"
                onClick={addOption}
                disabled={isLoading || !newOption.trim() || fields.length >= 10}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            {errors.options && (
              <p className="text-sm text-destructive">{errors.options.message}</p>
            )}
            <p className="text-sm text-muted-foreground">
              {fields.length}/10 options (minimum 2)
            </p>
          </div>

          {/* Poll Settings */}
          <div className="space-y-4">
            <Label>Poll Settings</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  {...register("isPublic")}
                  disabled={isLoading}
                />
                <Label htmlFor="isPublic">Make poll public</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="allowMultipleVotes"
                  {...register("allowMultipleVotes")}
                  disabled={isLoading}
                />
                <Label htmlFor="allowMultipleVotes">Allow multiple votes</Label>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating Poll..." : "Create Poll"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
