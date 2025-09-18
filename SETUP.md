# Setup Guide for Alx Polly

## 🚀 Quick Start

### 1. Environment Variables
Create a `.env.local` file in the root directory with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Supabase Database Setup

Create the following table in your Supabase database:

```sql
-- Create polls table
CREATE TABLE polls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  options TEXT[] NOT NULL,
  votes INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public polls are viewable by everyone" ON polls
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can insert their own polls" ON polls
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own polls" ON polls
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own polls" ON polls
  FOR DELETE USING (auth.uid() = user_id);
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run Development Server
```bash
npm run dev
```

### 5. Run Tests
```bash
npm test
```

## 📁 Project Structure (Following Rules)

```
app/
├── api/                    # API routes (RESTful)
│   ├── auth/              # Authentication endpoints
│   └── polls/             # Poll endpoints
├── components/            # Reusable UI components
│   ├── auth/             # Auth components
│   ├── polls/            # Poll components
│   └── layout/           # Layout components
├── contexts/             # React contexts
├── hooks/                # Custom hooks
├── lib/                  # Utility functions
└── polls/                # Poll pages
```

## 🧪 Testing

The project includes Jest and React Testing Library setup. Each component should have at least one test.

Run tests:
- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

## 🔧 API Endpoints

Following RESTful conventions:

- `GET /api/polls` - Fetch all polls
- `POST /api/polls` - Create new poll
- `GET /api/polls/[id]` - Fetch poll details
- `PUT /api/polls/[id]` - Update poll
- `DELETE /api/polls/[id]` - Delete poll
- `POST /api/polls/[id]/vote` - Submit vote
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout

## 📊 Database Schema

The `polls` table follows the exact schema specified in your rules:

- `id` - UUID primary key
- `question` - Poll question (string)
- `options[]` - Array of option strings
- `votes[]` - Array of vote counts
- `created_at` - Timestamp
- `user_id` - Foreign key to auth.users
- `is_public` - Boolean for public/private polls
- `is_active` - Boolean for active/inactive polls
- `expires_at` - Optional expiration timestamp
