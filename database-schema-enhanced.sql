-- Enhanced Database Schema for ALX Polly Pro
-- This schema extends the basic polling app with advanced features

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Profiles Table (Enhanced)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'moderator', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

-- Enhanced Polls Table
CREATE TABLE IF NOT EXISTS polls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  description TEXT,
  options TEXT[] NOT NULL,
  votes INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  allow_multiple_votes BOOLEAN DEFAULT false,
  -- Enhanced fields
  category TEXT,
  tags TEXT[],
  is_featured BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  -- Analytics
  total_votes INTEGER DEFAULT 0,
  unique_voters INTEGER DEFAULT 0,
  -- Moderation
  is_approved BOOLEAN DEFAULT true,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Poll Analytics Table
CREATE TABLE IF NOT EXISTS poll_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('view', 'vote', 'share', 'comment')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Additional context
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  session_id TEXT,
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- User Votes Table (Enhanced)
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  voter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Enhanced fields
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  -- Unique constraint for single vote per user per poll
  UNIQUE(poll_id, voter_id)
);

-- Comments Table
CREATE TABLE IF NOT EXISTS poll_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_approved BOOLEAN DEFAULT true,
  parent_id UUID REFERENCES poll_comments(id) ON DELETE CASCADE,
  -- Moderation
  is_flagged BOOLEAN DEFAULT false,
  flagged_reason TEXT,
  flagged_by UUID REFERENCES auth.users(id),
  flagged_at TIMESTAMP WITH TIME ZONE
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('poll_created', 'poll_ended', 'vote_received', 'comment_added', 'role_changed')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Email Templates Table
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_polls_created_by ON polls(created_by);
CREATE INDEX IF NOT EXISTS idx_polls_is_public ON polls(is_public);
CREATE INDEX IF NOT EXISTS idx_polls_is_active ON polls(is_active);
CREATE INDEX IF NOT EXISTS idx_polls_created_at ON polls(created_at);
CREATE INDEX IF NOT EXISTS idx_polls_category ON polls(category);
CREATE INDEX IF NOT EXISTS idx_polls_is_featured ON polls(is_featured);

CREATE INDEX IF NOT EXISTS idx_poll_analytics_poll_id ON poll_analytics(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_analytics_user_id ON poll_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_poll_analytics_action_type ON poll_analytics(action_type);
CREATE INDEX IF NOT EXISTS idx_poll_analytics_created_at ON poll_analytics(created_at);

CREATE INDEX IF NOT EXISTS idx_votes_poll_id ON votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter_id ON votes(voter_id);
CREATE INDEX IF NOT EXISTS idx_votes_created_at ON votes(created_at);

CREATE INDEX IF NOT EXISTS idx_comments_poll_id ON poll_comments(poll_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON poll_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON poll_comments(created_at);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON poll_comments(parent_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_user_id ON audit_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all profiles" ON user_profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for polls (enhanced)
CREATE POLICY "Public polls are viewable by everyone" ON polls
  FOR SELECT USING (is_public = true AND is_active = true);

CREATE POLICY "Users can view their own polls" ON polls
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their own polls" ON polls
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own polls" ON polls
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own polls" ON polls
  FOR DELETE USING (auth.uid() = created_by);

CREATE POLICY "Admins can manage all polls" ON polls
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- RLS Policies for poll_analytics
CREATE POLICY "Users can view their own analytics" ON poll_analytics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all analytics" ON poll_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "System can insert analytics" ON poll_analytics
  FOR INSERT WITH CHECK (true);

-- RLS Policies for votes
CREATE POLICY "Users can view their own votes" ON votes
  FOR SELECT USING (auth.uid() = voter_id);

CREATE POLICY "Users can insert their own votes" ON votes
  FOR INSERT WITH CHECK (auth.uid() = voter_id);

CREATE POLICY "Admins can view all votes" ON votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- RLS Policies for comments
CREATE POLICY "Public comments are viewable by everyone" ON poll_comments
  FOR SELECT USING (is_approved = true);

CREATE POLICY "Users can insert their own comments" ON poll_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON poll_comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON poll_comments
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all comments" ON poll_comments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- RLS Policies for audit_logs
CREATE POLICY "Admins can view audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- RLS Policies for email_templates
CREATE POLICY "Admins can manage email templates" ON email_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for system_settings
CREATE POLICY "Admins can manage system settings" ON system_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Functions for analytics
CREATE OR REPLACE FUNCTION update_poll_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE polls 
  SET total_votes = (
    SELECT COUNT(*) FROM votes WHERE poll_id = NEW.poll_id
  ),
  unique_voters = (
    SELECT COUNT(DISTINCT voter_id) FROM votes WHERE poll_id = NEW.poll_id
  )
  WHERE id = NEW.poll_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update vote counts
CREATE TRIGGER update_poll_vote_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON votes
  FOR EACH ROW EXECUTE FUNCTION update_poll_vote_count();

-- Function to update poll view count
CREATE OR REPLACE FUNCTION increment_poll_view_count(poll_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE polls 
  SET view_count = view_count + 1
  WHERE id = poll_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to update poll share count
CREATE OR REPLACE FUNCTION increment_poll_share_count(poll_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE polls 
  SET share_count = share_count + 1
  WHERE id = poll_uuid;
END;
$$ LANGUAGE plpgsql;

-- Insert default admin user profile (run after user creation)
-- This should be run after creating the first admin user in Supabase Auth
-- INSERT INTO user_profiles (id, email, name, role) 
-- VALUES ('your-admin-user-id', 'admin@example.com', 'Admin', 'admin');

-- Insert default email templates
INSERT INTO email_templates (name, subject, html_content, text_content) VALUES
('poll_created', 'New Poll Created', '<h1>New Poll Created</h1><p>A new poll has been created: {{poll_question}}</p>', 'New Poll Created: {{poll_question}}'),
('poll_ended', 'Poll Ended', '<h1>Poll Ended</h1><p>The poll "{{poll_question}}" has ended.</p>', 'Poll Ended: {{poll_question}}'),
('vote_received', 'New Vote Received', '<h1>New Vote Received</h1><p>Someone voted on your poll: {{poll_question}}</p>', 'New Vote Received: {{poll_question}}');

-- Insert default system settings
INSERT INTO system_settings (key, value, description) VALUES
('max_polls_per_user', '{"value": 50}', 'Maximum number of polls a user can create'),
('max_options_per_poll', '{"value": 10}', 'Maximum number of options per poll'),
('poll_expiry_days', '{"value": 30}', 'Default poll expiry in days'),
('require_approval', '{"value": false}', 'Whether new polls require approval'),
('allow_anonymous_voting', '{"value": true}', 'Whether anonymous voting is allowed'),
('max_comment_length', '{"value": 500}', 'Maximum length of poll comments');
