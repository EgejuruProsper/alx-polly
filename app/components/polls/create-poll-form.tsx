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

/**
 * CreatePollFormProps interface
 * 
 * WHY: Defines the contract for the CreatePollForm component.
 * Ensures type safety and clear component API.
 */
interface CreatePollFormProps {
  onSubmit: (data: CreatePollFormData) => Promise<void>;
  isLoading?: boolean;
  error?: string;
  success?: string;
  defaultValues?: CreatePollFormData;
}

/**
 * CreatePollForm Component
 * ------------------------
 * Controlled form for creating and editing polls with comprehensive validation.
 * 
 * WHY: Centralizes poll creation logic with client-side validation and UX enhancements.
 * Provides real-time feedback and prevents invalid submissions.
 * 
 * Features:
 * - Real-time validation with Zod schema
 * - Dynamic option management (add/remove)
 * - Progress tracking and visual feedback
 * - Duplicate option prevention
 * - Accessibility support
 * 
 * Accessibility considerations:
 * - Proper label associations with htmlFor/id
 * - Keyboard navigation support
 * - Screen reader friendly error messages
 * - Focus management on validation errors
 * 
 * @param props - Component props including onSubmit handler and state
 */
export function CreatePollForm({ onSubmit, isLoading = false, error, success, defaultValues }: CreatePollFormProps) {
  // State for managing dynamic options and form validation
  const [newOption, setNewOption] = useState("");
  const [hasEmptyOptions, setHasEmptyOptions] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);

  // React Hook Form setup with Zod validation
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
    resolver: zodResolver(createPollSchema), // Client-side validation matches server
    mode: "onChange", // Enable real-time validation for better UX
    defaultValues: defaultValues || {
      title: "",
      description: "",
      options: ["", ""], // Minimum 2 options required
      isPublic: true,
      allowMultipleVotes: false,
    },
  });

  // Update form when defaultValues change (for editing existing polls)
  useEffect(() => {
    if (defaultValues) {
      reset(defaultValues);
    }
  }, [defaultValues, reset]);

  // Watch for empty options to provide real-time feedback
  const watchedOptions = watch("options");
  useEffect(() => {
    const hasEmpty = watchedOptions?.some((option: string) => !option?.trim());
    setHasEmptyOptions(hasEmpty);
  }, [watchedOptions]);

  // Calculate form completion percentage for progress indicator
  const calculateFormProgress = () => {
    const title = watch("title")?.trim();
    const options = watch("options");
    const validOptions = options?.filter(opt => opt?.trim()).length || 0;
    
    // Weighted progress calculation
    let progress = 0;
    if (title) progress += 25; // Title is essential
    if (validOptions >= 2) progress += 50; // Minimum 2 options required
    if (validOptions >= 3) progress += 15; // Bonus for more options
    if (validOptions >= 4) progress += 10; // Additional bonus
    
    return Math.min(progress, 100);
  };

  const formProgress = calculateFormProgress();

  // Dynamic field array for poll options
  const { fields, append, remove } = useFieldArray({
    control,
    name: "options"
  } as any);

  // Add new option with validation
  const addOption = () => {
    if (newOption.trim() && fields.length < 10) {
      append(newOption.trim() as any);
      setNewOption("");
      // Trigger validation after adding option to update form state
      setTimeout(() => trigger("options"), 100);
    }
  };

  // Remove option (minimum 2 options required)
  const removeOption = (index: number) => {
    if (fields.length > 2) {
      remove(index);
      // Trigger validation after removing option to update form state
      setTimeout(() => trigger("options"), 100);
    }
  };

  // Form submission handler with additional validation
  const handleFormSubmit = async (data: CreatePollFormData) => {
    // Clear previous custom errors
    setCustomError(null);

    // Additional client-side validation beyond Zod schema
    const hasEmptyOptions = data.options.some((option: string) => !option.trim());
    if (hasEmptyOptions) {
      setCustomError("Please fill in all poll options. Empty options are not allowed.");
      return;
    }

    // Check for duplicate options (case-insensitive)
    const uniqueOptions = new Set(data.options.map((option: string) => option.trim().toLowerCase()));
    if (uniqueOptions.size !== data.options.length) {
      setCustomError("Duplicate options are not allowed. Please make each option unique.");
      return;
    }

    try {
      await onSubmit(data);
    } catch (err) {
      // Error handling is done in the parent component
      // This prevents unhandled promise rejections
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
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <AlertDescription className="text-red-800 font-medium">
                    {error || customError}
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          )}
          
          {success && (
            <Alert className="border-green-200 bg-green-50">
              <div className="flex items-start space-x-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <AlertDescription className="text-green-800 font-medium">
                    {success}
                  </AlertDescription>
                </div>
              </div>
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
              <div className="flex items-start space-x-2 text-sm text-red-600 bg-red-50 p-2 rounded-md border border-red-200">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span className="font-medium">{errors.title.message}</span>
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
              <div className="flex items-start space-x-2 text-sm text-red-600 bg-red-50 p-2 rounded-md border border-red-200">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span className="font-medium">{errors.description.message}</span>
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
                    <div className="flex items-start space-x-2 text-sm text-red-600 bg-red-50 p-2 rounded-md border border-red-200 ml-1">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span className="font-medium">{errors.options[index]?.message}</span>
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
                  variant={newOption.trim() && fields.length < 10 ? "default" : "outline"}
                onClick={addOption}
                  disabled={isLoading || !newOption.trim() || fields.length >= 10 || !!success}
                  className={`flex items-center space-x-2 px-4 py-2 transition-all duration-200 ${
                    !newOption.trim() || fields.length >= 10
                      ? "opacity-50 cursor-not-allowed"
                      : newOption.trim() && fields.length < 10
                      ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700"
                      : "hover:bg-blue-50 hover:border-blue-500 hover:text-blue-600"
                  }`}
              >
                <Plus className="h-4 w-4" />
                  <span className="font-medium">
                    {fields.length >= 10 ? "Max Reached" : "Add Option"}
                  </span>
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
              <div className="flex items-start space-x-2 text-sm text-red-600 bg-red-50 p-2 rounded-md border border-red-200">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span className="font-medium">{errors.options.message}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {fields.length}/10 options (minimum 2)
            </p>
              {hasEmptyOptions && (
                <div className="flex items-center space-x-2 text-sm text-red-600 bg-red-50 px-2 py-1 rounded-md">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">Some options are empty</span>
                </div>
              )}
              {!isValid && isDirty && !hasEmptyOptions && (
                <div className="flex items-center space-x-2 text-sm text-red-600 bg-red-50 px-2 py-1 rounded-md">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">Please fill in all required fields</span>
                </div>
              )}
              {isValid && isDirty && (
                <div className="flex items-center space-x-2 text-sm text-green-600 bg-green-50 px-2 py-1 rounded-md">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">Form is valid</span>
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

          {/* Form Progress & Submit Button */}
          <div className="bg-gray-50 p-4 rounded-lg border">
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Form Progress</span>
                <span className="text-sm text-gray-600">{formProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    formProgress === 100 ? 'bg-green-500' : 
                    formProgress >= 75 ? 'bg-blue-500' : 
                    formProgress >= 50 ? 'bg-yellow-500' : 'bg-gray-400'
                  }`}
                  style={{ width: `${formProgress}%` }}
                ></div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
              <div className="flex items-center space-x-3">
                {!isValid && isDirty && (
                  <div className="flex items-center space-x-2 text-red-600 bg-red-50 px-3 py-2 rounded-md border border-red-200">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">Please fix errors to continue</span>
                  </div>
                )}
                {isValid && isDirty && (
                  <div className="flex items-center space-x-2 text-green-600 bg-green-50 px-3 py-2 rounded-md border border-green-200">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-medium">Ready to submit</span>
                  </div>
                )}
                {!isDirty && (
                  <div className="flex items-center space-x-2 text-gray-600">
                    <div className="h-4 w-4 rounded-full border-2 border-gray-300"></div>
                    <span>Complete the form to submit</span>
                  </div>
                )}
              </div>
              <div className="flex space-x-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  disabled={isLoading || !!success}
                  className="px-6 py-2 border-gray-300 hover:border-gray-400"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading || !!success || !isValid}
                  className={`px-6 py-2 transition-all duration-200 font-medium ${
                    !isValid && isDirty 
                      ? "opacity-50 cursor-not-allowed bg-gray-400" 
                      : isValid && isDirty 
                      ? "bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl" 
                      : "bg-blue-600 hover:bg-blue-700 text-white"
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
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
