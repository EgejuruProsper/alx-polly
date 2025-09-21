# ALX Polly – Modern Polling App

A secure, full-stack polling application built with **Next.js 15**, **TypeScript**, **Supabase**, and **shadcn/ui**. Features enterprise-grade security, real-time voting, and comprehensive input validation.

> This project demonstrates AI-assisted development workflows including scaffolding, refactoring, testing, security auditing, and documentation.

## 🚀 Features

- **🔐 Secure Authentication**: Server-side session management with Supabase
- **📊 Poll Management**: Create, vote, and manage polls with real-time results
- **🛡️ Enterprise Security**: Rate limiting, input validation, PII protection
- **📱 Responsive Design**: Beautiful UI that works on all devices
- **🔒 Type Safety**: Full TypeScript support with Zod validation
- **⚡ Performance**: Optimized for thousands of votes with caching

## 🏗️ Project Structure

```
alx-polly/
├── app/                          # Next.js App Router pages
│   ├── auth/                     # Authentication pages
│   │   ├── login/               # Login page
│   │   └── register/            # Registration page
│   ├── polls/                   # Poll-related pages
│   │   ├── create/              # Create poll page
│   │   └── [id]/                # Individual poll details
│   ├── profile/                 # User profile page
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Home page
├── components/                   # Reusable components
│   ├── auth/                    # Authentication components
│   │   ├── login-form.tsx
│   │   ├── register-form.tsx
│   │   └── profile-form.tsx
│   ├── polls/                   # Poll-related components
│   │   ├── poll-card.tsx
│   │   ├── poll-list.tsx
│   │   ├── poll-details.tsx
│   │   └── create-poll-form.tsx
│   ├── layout/                  # Layout components
│   │   ├── header.tsx
│   │   ├── footer.tsx
│   │   └── layout.tsx
│   └── ui/                      # Shadcn UI components
├── contexts/                    # React contexts
│   └── auth-context.tsx        # Authentication context
├── hooks/                       # Custom React hooks
│   └── use-polls.ts            # Polls data hook
├── lib/                         # Utility functions
│   ├── constants.ts            # App constants
│   ├── validations.ts          # Form validation schemas
│   └── utils.ts                # Utility functions
├── types/                       # TypeScript type definitions
│   └── index.ts                # Main type definitions
└── public/                      # Static assets
```

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with server-side sessions
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Security**: Rate limiting, input validation, PII protection

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/EgejuruProsper/alx-polly.git
   cd alx-polly
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up the database**:
   Run the SQL schema from `database-schema.sql` in your Supabase SQL editor.

5. **Run the development server**:
   ```bash
   npm run dev
   ```

6. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📋 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm test` - Run security and unit tests
- `npm run lint` - Run ESLint

## 🔐 Security Features

### Authentication & Authorization
- ✅ Server-side session management with Supabase
- ✅ No client-side token storage (httpOnly cookies)
- ✅ Row Level Security (RLS) enabled
- ✅ Protected API routes with authentication

### Input Validation & Security
- ✅ Comprehensive Zod validation on all inputs
- ✅ Rate limiting (5 polls/min, 100 fetches/min, 10 votes/min)
- ✅ SQL injection prevention
- ✅ XSS protection with security headers
- ✅ PII protection (no email exposure)

### Platform Security
- ✅ Security headers (CSP, HSTS, X-Frame-Options)
- ✅ CORS configuration
- ✅ Request size limits (1MB max)
- ✅ Error message sanitization

## 🎯 Key Features Implemented

### Authentication
- ✅ Secure login/register with Supabase Auth
- ✅ Server-side session management
- ✅ Profile management
- ✅ Authentication context with real-time updates

### Poll Management
- ✅ Create polls with validation and rate limiting
- ✅ Poll listing with search, filters, and pagination
- ✅ Individual poll details with voting
- ✅ Real-time vote counting
- ✅ Poll ownership and permissions

### Security & Performance
- ✅ Enterprise-grade security implementation
- ✅ Rate limiting and abuse prevention
- ✅ Input validation and sanitization
- ✅ PII protection and data privacy
- ✅ Optimized for thousands of votes

## 🧪 Testing

The project includes comprehensive security testing:

```bash
# Run all tests
npm test

# Run security tests specifically
npm run test:security

# Run with coverage
npm run test:coverage
```

## 📚 Documentation

- **Security Audit**: `COMPREHENSIVE_SECURITY_AUDIT.md`
- **Implementation Summary**: `SECURITY_IMPLEMENTATION_SUMMARY.md`
- **API Documentation**: Comprehensive JSDoc comments with security considerations
- **Setup Guide**: `SETUP.md`
- **Code Documentation**: Intentional docstrings explaining WHY, not just WHAT
- **Inline Comments**: Edge cases, security implications, and business logic explained

### Documentation Standards

This project follows intentional documentation practices:

- **Docstrings explain WHY**: Not just what code does, but why it exists in the context of the app
- **Edge cases documented**: Assumptions, failure modes, and error handling clearly explained
- **Security considerations**: Authentication flows, data protection, and vulnerability prevention
- **Accessibility notes**: Screen reader support, keyboard navigation, and UX considerations
- **Living documentation**: Updated with each PR, tied to source control

## 🚀 Production Ready

This application is **production-ready** with:
- ✅ Zero critical security vulnerabilities
- ✅ Enterprise-grade security implementation
- ✅ Comprehensive input validation
- ✅ Rate limiting and abuse prevention
- ✅ PII protection and data privacy

## 📝 Development Notes

- All forms use React Hook Form with Zod validation
- Components are built with Shadcn UI for consistency
- TypeScript types are defined in `/types/index.ts`
- Authentication state is managed via React Context
- Mock data is used for development - replace with actual API calls

### Code Quality Standards

- **Intentional Documentation**: Every function explains WHY it exists, not just WHAT it does
- **Security-First**: All code includes security considerations and edge cases
- **Accessibility**: Components include screen reader support and keyboard navigation
- **Error Handling**: Comprehensive error boundaries with sanitized messages
- **Type Safety**: Full TypeScript coverage with strict validation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.