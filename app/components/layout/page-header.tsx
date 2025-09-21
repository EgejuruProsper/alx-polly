"use client";

import { ReactNode } from 'react';
import { Button } from '@/app/components/ui/button';
import { Plus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
  showBackButton?: boolean;
  backHref?: string;
  showCreateButton?: boolean;
  createHref?: string;
  createButtonText?: string;
}

export function PageHeader({
  title,
  description,
  children,
  showBackButton = false,
  backHref = '/',
  showCreateButton = false,
  createHref = '/polls/create',
  createButtonText = 'Create Poll'
}: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
      <div className="space-y-1">
        <div className="flex items-center space-x-2">
          {showBackButton && (
            <Button variant="ghost" size="icon" asChild>
              <Link href={backHref}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
          )}
          <h1 className="text-3xl font-bold">{title}</h1>
        </div>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>
      
      <div className="flex items-center space-x-2">
        {children}
        {showCreateButton && (
          <Button asChild>
            <Link href={createHref}>
              <Plus className="h-4 w-4 mr-2" />
              {createButtonText}
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
