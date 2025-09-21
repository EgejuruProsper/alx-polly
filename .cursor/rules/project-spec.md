# ALX Polly Project Rules

## API Routes
1. All API routes must validate input with Zod schemas
2. Use descriptive error messages but never leak database details
3. Always prefer async/await syntax, avoid .then chaining
4. Use try/catch blocks around Supabase calls
5. Return typed responses (TypeScript interfaces) for clarity

## Components
1. All components must be accessible (ARIA labels, keyboard navigation)
2. Use shadcn/ui components for consistency
3. Include loading states and error handling
4. Follow React hooks best practices
5. Use TypeScript interfaces for all props

## Security
1. Sanitize all user inputs before processing
2. Never expose sensitive data in client-side code
3. Use server-side authentication for protected operations
4. Implement proper error boundaries
5. Validate all external data with Zod schemas

## Performance
1. Use React.memo for expensive components
2. Implement proper loading states
3. Optimize images and assets
4. Use proper caching strategies
5. Minimize bundle size with dynamic imports

## Documentation
1. Add JSDoc comments explaining WHY, not just WHAT
2. Document edge cases and error scenarios
3. Include accessibility considerations
4. Explain business logic and security implications
5. Keep documentation up-to-date with code changes
