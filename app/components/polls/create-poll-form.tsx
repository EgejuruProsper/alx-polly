"use client";

import { useState, useEffect } from "react";
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
import { Plus, X, AlertCircle, CheckCircle2 } from "lucide-react";

interface CreatePollFormProps {
  onSubmit: (data: CreatePollFormData) => Promise<void>;
  isLoading?: boolean;
  error?: string;
  success?: string;
  defaultValues?: CreatePollFormData;
}

export function CreatePollForm({ onSubmit, isLoading = false, error, success, defaultValues }: CreatePollFormProps) {
  const [newOption, setNewOption] = useState("");
  const [hasEmptyOptions, setHasEmptyOptions] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isValid, isDirty },
    watch,
    setValue,
    reset,
    trigger,
  } = useForm<CreatePollFormData>({
    resolver: zodResolver(createPollSchema),
    mode: "onChange", // Enable real-time validation
    defaultValues: defaultValues || {
      title: "",
      description: "",
      options: ["", ""],
      isPublic: true,
      allowMultipleVotes: false,
    },
  });

  // Update form when defaultValues change (for editing)
  useEffect(() => {
    if (defaultValues) {
      reset(defaultValues);
    }
  }, [defaultValues, reset]);

  // Watch for empty options
  const watchedOptions = watch("options");
  useEffect(() => {
    const hasEmpty = watchedOptions?.some((option: string) => !option?.trim());
    setHasEmptyOptions(hasEmpty);
  }, [watchedOptions]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "options",
  });

  const addOption = () => {
    if (newOption.trim() && fields.length < 10) {
      append(newOption.trim());
      setNewOption("");
      // Trigger validation after adding option
      setTimeout(() => trigger("options"), 100);
    }
  };

  const removeOption = (index: number) => {
    if (fields.length > 2) {
      remove(index);
      // Trigger validation after removing option
      setTimeout(() => trigger("options"), 100);
    }
  };

  const handleFormSubmit = async (data: CreatePollFormData) => {
    // Clear previous custom errors
    setCustomError(null);

    // Additional client-side validation
    const hasEmptyOptions = data.options.some(option => !option.trim());
    if (hasEmptyOptions) {
      setCustomError("Please fill in all poll options. Empty options are not allowed.");
      return;
    }

    // Check for duplicate options
    const uniqueOptions = new Set(data.options.map(option => option.trim().toLowerCase()));
    if (uniqueOptions.size !== data.options.length) {
      setCustomError("Duplicate options are not allowed. Please make each option unique.");
      return;
    }

    try {
      await onSubmit(data);
    } catch (err) {
      // Error handling is done in the parent component
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
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {(error || customError) && (
            <Alert variant="destructive">
              <AlertDescription>{error || customError}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Poll Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Poll Title *</Label>
            <Input
              id="title"
              placeholder="What's your poll about?"
              {...register("title")}
              disabled={isLoading || !!success}
              className={`transition-colors duration-200 ${
                errors.title 
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500" 
                  : watch("title") && !errors.title 
                  ? "border-green-500 focus:border-green-500 focus:ring-green-500" 
                  : ""
              }`}
            />
            {errors.title && (
              <div className="flex items-center space-x-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{errors.title.message}</span>
              </div>
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
              disabled={isLoading || !!success}
            />
            {errors.description && (
              <div className="flex items-center space-x-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{errors.description.message}</span>
              </div>
            )}
          </div>

          {/* Poll Options */}
          <div className="space-y-4">
            <Label>Poll Options *</Label>
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Input
                      placeholder={`Option ${index + 1}`}
                      {...register(`options.${index}`)}
                      disabled={isLoading || !!success}
                      className={`transition-colors duration-200 ${
                        errors.options?.[index] 
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500" 
                          : watch(`options.${index}`) && !errors.options?.[index] 
                          ? "border-green-500 focus:border-green-500 focus:ring-green-500" 
                          : ""
                      }`}
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
                  {errors.options?.[index] && (
                    <div className="flex items-center space-x-2 text-sm text-destructive ml-1">
                      <AlertCircle className="h-4 w-4" />
                      <span>{errors.options[index]?.message}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Add new option */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Add new option"
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  disabled={isLoading || fields.length >= 10 || !!success}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newOption.trim() && fields.length < 10) {
                      e.preventDefault();
                      addOption();
                    }
                  }}
                  className={`flex-1 transition-colors duration-200 ${
                    fields.length >= 10 
                      ? "border-gray-300 bg-gray-50" 
                      : newOption.trim() 
                      ? "border-blue-500 focus:border-blue-500 focus:ring-blue-500" 
                      : ""
                  }`}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addOption}
                  disabled={isLoading || !newOption.trim() || fields.length >= 10 || !!success}
                  className={`flex items-center space-x-2 px-4 transition-all duration-200 ${
                    !newOption.trim() || fields.length >= 10
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-blue-50 hover:border-blue-500 hover:text-blue-600"
                  }`}
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add Option</span>
                </Button>
              </div>
              {fields.length >= 10 && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  <span>Maximum 10 options reached</span>
                </div>
              )}
            </div>
            
            {errors.options && (
              <div className="flex items-center space-x-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{errors.options.message}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {fields.length}/10 options (minimum 2)
              </p>
              {hasEmptyOptions && (
                <div className="flex items-center space-x-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>Some options are empty</span>
                </div>
              )}
              {!isValid && isDirty && !hasEmptyOptions && (
                <div className="flex items-center space-x-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>Please fill in all required fields</span>
                </div>
              )}
              {isValid && isDirty && (
                <div className="flex items-center space-x-2 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Form is valid</span>
                </div>
              )}
            </div>
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
                  disabled={isLoading || !!success}
                />
                <Label htmlFor="isPublic">Make poll public</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="allowMultipleVotes"
                  {...register("allowMultipleVotes")}
                  disabled={isLoading || !!success}
                />
                <Label htmlFor="allowMultipleVotes">Allow multiple votes</Label>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              {!isValid && isDirty && (
                <div className="flex items-center space-x-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>Please fix errors to continue</span>
                </div>
              )}
              {isValid && isDirty && (
                <div className="flex items-center space-x-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Ready to submit</span>
                </div>
              )}
            </div>
            <div className="flex space-x-4">
              <Button 
                type="button" 
                variant="outline" 
                disabled={isLoading || !!success}
                className="px-6"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || !!success || !isValid}
                className={`px-6 transition-all duration-200 ${
                  !isValid && isDirty 
                    ? "opacity-50 cursor-not-allowed" 
                    : isValid && isDirty 
                    ? "bg-green-600 hover:bg-green-700" 
                    : ""
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>{defaultValues ? "Updating Poll..." : "Creating Poll..."}</span>
                  </div>
                ) : success ? (
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{defaultValues ? "Poll Updated!" : "Poll Created!"}</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span>{defaultValues ? "Update Poll" : "Create Poll"}</span>
                    {isValid && isDirty && <CheckCircle2 className="h-4 w-4" />}
                  </div>
                )}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
