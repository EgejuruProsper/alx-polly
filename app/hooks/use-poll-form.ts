"use client";

import { useState, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createPollSchema, CreatePollFormData } from '@/lib/validations';
import { config } from '@/lib/config';

interface UsePollFormOptions {
  initialData?: Partial<CreatePollFormData>;
  onSubmit: (data: CreatePollFormData) => Promise<void>;
}

interface UsePollFormReturn {
  form: ReturnType<typeof useForm<CreatePollFormData>>;
  fieldArray: any; // Simplified type to avoid complex generic issues
  hasEmptyOptions: boolean;
  customError: string | null;
  setCustomError: (error: string | null) => void;
  addOption: () => void;
  removeOption: (index: number) => void;
  handleSubmit: (data: CreatePollFormData) => Promise<void>;
  validateForm: () => Promise<boolean>;
  resetForm: () => void;
}

export function usePollForm({ initialData, onSubmit }: UsePollFormOptions): UsePollFormReturn {
  const [hasEmptyOptions, setHasEmptyOptions] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);

  const form = useForm<CreatePollFormData>({
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

  const fieldArray = useFieldArray({
    control: form.control,
    name: 'options'
  } as any);

  const options = form.watch('options');

  // Check for empty options
  const checkEmptyOptions = useCallback(() => {
    const hasEmpty = options.some(option => !option.trim());
    setHasEmptyOptions(hasEmpty);
    return hasEmpty;
  }, [options]);

  const addOption = useCallback(() => {
    if (options.length < config.polls.maxOptions) {
      fieldArray.append('');
      form.trigger('options');
    }
  }, [options.length, fieldArray, form]);

  const removeOption = useCallback((index: number) => {
    if (options.length > config.polls.minOptions) {
      fieldArray.remove(index);
      form.trigger('options');
    }
  }, [options.length, fieldArray, form]);

  const validateForm = useCallback(async (): Promise<boolean> => {
    setCustomError(null);
    
    // Check for empty options
    if (checkEmptyOptions()) {
      setCustomError('❌ All poll options must have content - no empty options allowed');
      return false;
    }

    // Check for duplicate options (case-insensitive, trimmed)
    const trimmedOptions = options.map(opt => opt.trim().toLowerCase());
    const uniqueOptions = new Set(trimmedOptions);
    if (uniqueOptions.size !== trimmedOptions.length) {
      setCustomError('🔄 Duplicate options detected - each option must be unique');
      return false;
    }

    // Validate with Zod
    const isValid = await form.trigger();
    if (!isValid) {
      setCustomError('⚠️ Please fix the validation errors above');
      return false;
    }

    return true;
  }, [checkEmptyOptions, options, form]);

  const handleSubmit = useCallback(async (data: CreatePollFormData) => {
    setCustomError(null);
    
    const isValid = await validateForm();
    if (!isValid) {
      return;
    }

    try {
      await onSubmit(data);
    } catch (err) {
      setCustomError(err instanceof Error ? err.message : 'An unexpected error occurred');
    }
  }, [validateForm, onSubmit]);

  const resetForm = useCallback(() => {
    form.reset();
    setCustomError(null);
    setHasEmptyOptions(false);
  }, [form]);

  return {
    form,
    fieldArray,
    hasEmptyOptions,
    customError,
    setCustomError,
    addOption,
    removeOption,
    handleSubmit,
    validateForm,
    resetForm
  };
}
