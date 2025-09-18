# Alx Polly - Modern Polling App

A modern, full-stack polling application built with Next.js 15, TypeScript, and Shadcn UI components.

## 🚀 Features

- **User Authentication**: Login, register, and profile management
- **Poll Creation**: Create polls with multiple options and settings
- **Poll Voting**: Vote on polls with real-time results
- **Poll Management**: View, edit, and manage your polls
- **Responsive Design**: Beautiful UI that works on all devices
- **Type Safety**: Full TypeScript support throughout

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
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React
- **Date Handling**: date-fns

## 🚀 Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run the development server**:
   ```bash
   npm run dev
   ```

3. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📋 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server

## 🎯 Key Features Implemented

### Authentication
- ✅ Login form with validation
- ✅ Registration form with validation
- ✅ Profile management
- ✅ Authentication context

### Poll Management
- ✅ Create poll form with dynamic options
- ✅ Poll listing with search and filters
- ✅ Individual poll details page
- ✅ Voting functionality (UI ready)

### UI/UX
- ✅ Responsive design
- ✅ Modern UI with Shadcn components
- ✅ Loading states and error handling
- ✅ Form validation with Zod

## 🔧 Next Steps

To complete the application, you'll need to implement:

1. **Backend API**: Create API routes for authentication and polls
2. **Database**: Set up database for users and polls
3. **Real Authentication**: Implement actual login/register logic
4. **Real-time Updates**: Add WebSocket support for live poll updates
5. **File Uploads**: Add avatar upload functionality
6. **Email Verification**: Add email verification for registration
7. **Password Reset**: Implement password reset functionality

## 📝 Development Notes

- All forms use React Hook Form with Zod validation
- Components are built with Shadcn UI for consistency
- TypeScript types are defined in `/types/index.ts`
- Authentication state is managed via React Context
- Mock data is used for development - replace with actual API calls

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.