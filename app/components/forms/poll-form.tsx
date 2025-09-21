"use client";

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createPollSchema, CreatePollFormData } from '@/lib/validations';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Plus, X, AlertCircle } from 'lucide-react';

interface PollFormProps {
  initialData?: Partial<CreatePollFormData>;
  onSubmit: (data: CreatePollFormData) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  success?: string | null;
  submitText?: string;
}

export function PollForm({
  initialData,
  onSubmit,
  isLoading = false,
  error,
  success,
  submitText = 'Create Poll'
}: PollFormProps) {
  const [hasEmptyOptions, setHasEmptyOptions] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isValid, isDirty },
    trigger,
    setValue
  } = useForm<CreatePollFormData>({
    resolver: zodResolver(createPollSchema),
    mode: 'onChange',
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      options: initialData?.options || ['', ''],
      isPublic: initialData?.isPublic ?? true,
      allowMultipleVotes: initialData?.allowMultipleVotes ?? false,
      expiresAt: initialData?.expiresAt
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'options'
  } as any);

  const options = watch('options');

  // Check for empty options
  useEffect(() => {
    const hasEmpty = options.some(option => !option.trim());
    setHasEmptyOptions(hasEmpty);
  }, [options]);

  const addOption = () => {
    if (options.length < 10) {
      append('');
      trigger('options');
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      remove(index);
      trigger('options');
    }
  };

  const handleFormSubmit = async (data: CreatePollFormData) => {
    setCustomError(null);
    
    // Check for empty options
    if (hasEmptyOptions) {
      setCustomError('❌ All poll options must have content - no empty options allowed');
      return;
    }

    // Check for duplicate options (case-insensitive, trimmed)
    const trimmedOptions = data.options.map(opt => opt.trim().toLowerCase());
    const uniqueOptions = new Set(trimmedOptions);
    if (uniqueOptions.size !== trimmedOptions.length) {
      setCustomError('🔄 Duplicate options detected - each option must be unique');
      return;
    }

    try {
      await onSubmit(data);
    } catch (err) {
      setCustomError(err instanceof Error ? err.message : 'An unexpected error occurred');
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{submitText}</CardTitle>
        <CardDescription>
          Create a new poll to gather opinions from your community
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Poll Question *</Label>
            <Input
              id="title"
              {...register('title')}
              placeholder="What would you like to ask?"
              disabled={isLoading || !!success}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Add more context about your poll..."
              rows={3}
              disabled={isLoading || !!success}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Options */}
          <div className="space-y-4">
            <Label>Poll Options *</Label>
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-center space-x-2">
                <Input
                  {...register(`options.${index}`)}
                  placeholder={`Option ${index + 1}`}
                  disabled={isLoading || !!success}
                />
                {options.length > 2 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeOption(index)}
                    disabled={isLoading || !!success}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            
            {/* Individual option errors */}
            {errors.options && Array.isArray(errors.options) && (
              <div className="space-y-1">
                {errors.options.map((error, index) => (
                  error && (
                    <p key={index} className="text-sm text-destructive">
                      Option {index + 1}: {error.message}
                    </p>
                  )
                ))}
              </div>
            )}

            {/* Add new option */}
            {options.length < 10 && (
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={addOption}
                  disabled={isLoading || !!success}
                  className="flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Option</span>
                </Button>
                {options.length >= 8 && (
                  <p className="text-sm text-muted-foreground">
                    Maximum 10 options allowed
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="isPublic">Visibility</Label>
              <select
                id="isPublic"
                {...register('isPublic')}
                disabled={isLoading || !!success}
                className="w-full p-2 border rounded-md"
              >
                <option value="true">Public</option>
                <option value="false">Private</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="allowMultipleVotes">Voting</Label>
              <select
                id="allowMultipleVotes"
                {...register('allowMultipleVotes')}
                disabled={isLoading || !!success}
                className="w-full p-2 border rounded-md"
              >
                <option value="false">Single Vote</option>
                <option value="true">Multiple Votes</option>
              </select>
            </div>
          </div>

          {/* Expiration Date */}
          <div className="space-y-2">
            <Label htmlFor="expiresAt">Expiration Date (Optional)</Label>
            <Input
              id="expiresAt"
              type="datetime-local"
              {...register('expiresAt', {
                setValueAs: (value) => value ? new Date(value) : undefined
              })}
              disabled={isLoading || !!success}
            />
            {errors.expiresAt && (
              <p className="text-sm text-destructive">{errors.expiresAt.message}</p>
            )}
          </div>

          {/* Error Messages */}
          {(error || customError) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error || customError}
              </AlertDescription>
            </Alert>
          )}

          {/* Success Message */}
          {success && (
            <Alert>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Validation Summary */}
          {(hasEmptyOptions || (!isValid && isDirty)) && (
            <div className="text-sm text-muted-foreground space-y-1">
              {hasEmptyOptions && (
                <p>⚠️ Please fill in all poll options</p>
              )}
              {!isValid && isDirty && (
                <p>⚠️ Please fix the errors above</p>
              )}
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading || !!success || !isValid || hasEmptyOptions}
            className="w-full"
          >
            {isLoading ? 'Creating...' : success ? 'Created!' : submitText}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
