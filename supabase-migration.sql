-- Migration script for Supabase Polling App
-- Run this in your Supabase SQL Editor

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS polls CASCADE;

-- Create polls table
CREATE TABLE polls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question TEXT NOT NULL,
  options TEXT[] NOT NULL,
  votes INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_public BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  allow_multiple_votes BOOLEAN DEFAULT false,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create votes table
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL,
  voter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (poll_id, voter_id)
);

-- Create indexes
CREATE INDEX idx_polls_created_by ON polls(created_by);
CREATE INDEX idx_polls_is_public ON polls(is_public);
CREATE INDEX idx_polls_is_active ON polls(is_active);
CREATE INDEX idx_polls_created_at ON polls(created_at);
CREATE INDEX idx_votes_poll_id ON votes(poll_id);
CREATE INDEX idx_votes_voter_id ON votes(voter_id);

-- Enable Row Level Security
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for polls
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

-- RLS Policies for votes
CREATE POLICY "Users can view votes for public polls" ON votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM polls 
      WHERE polls.id = votes.poll_id 
      AND polls.is_public = true 
      AND polls.is_active = true
    )
  );

CREATE POLICY "Users can view their own votes" ON votes
  FOR SELECT USING (auth.uid() = voter_id);

CREATE POLICY "Users can insert their own votes" ON votes
  FOR INSERT WITH CHECK (auth.uid() = voter_id);

CREATE POLICY "Users can update their own votes" ON votes
  FOR UPDATE USING (auth.uid() = voter_id);

CREATE POLICY "Users can delete their own votes" ON votes
  FOR DELETE USING (auth.uid() = voter_id);

-- Function to update poll vote counts
CREATE OR REPLACE FUNCTION update_poll_vote_counts()
RETURNS TRIGGER AS $$
DECLARE
  poll_uuid UUID;
  option_count INTEGER;
  vote_counts INTEGER[];
BEGIN
  poll_uuid := COALESCE(NEW.poll_id, OLD.poll_id);
  
  -- Get the number of options for this poll
  SELECT array_length(options, 1) INTO option_count
  FROM polls WHERE id = poll_uuid;
  
  -- Initialize vote_counts array with zeros
  vote_counts := ARRAY[]::INTEGER[];
  FOR i IN 1..option_count LOOP
    vote_counts := vote_counts || 0;
  END LOOP;
  
  -- Count votes for each option
  FOR i IN 0..(option_count - 1) LOOP
    SELECT COUNT(*) INTO vote_counts[i + 1]
    FROM votes 
    WHERE poll_id = poll_uuid AND option_index = i;
  END LOOP;
  
  -- Update the polls table
  UPDATE polls 
  SET votes = vote_counts
  WHERE id = poll_uuid;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update vote counts
CREATE TRIGGER update_poll_votes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION update_poll_vote_counts();

-- Function to check if user can vote
CREATE OR REPLACE FUNCTION can_user_vote(poll_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  poll_record polls%ROWTYPE;
  existing_votes_count INTEGER;
BEGIN
  SELECT * INTO poll_record FROM polls WHERE id = poll_uuid;
  
  IF NOT FOUND OR NOT poll_record.is_active THEN
    RETURN FALSE;
  END IF;
  
  IF poll_record.expires_at IS NOT NULL AND poll_record.expires_at < NOW() THEN
    RETURN FALSE;
  END IF;
  
  SELECT COUNT(*) INTO existing_votes_count 
  FROM votes 
  WHERE poll_id = poll_uuid AND voter_id = user_uuid;
  
  IF NOT poll_record.allow_multiple_votes AND existing_votes_count > 0 THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON polls TO authenticated;
GRANT ALL ON votes TO authenticated;
GRANT SELECT ON polls TO anon;
GRANT SELECT ON votes TO anon;
