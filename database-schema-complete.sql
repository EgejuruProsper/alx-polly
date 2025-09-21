-- Complete Supabase Database Schema for Polling App
-- Includes all features from the existing codebase with proper vote tracking

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Polls table (enhanced version of existing schema)
CREATE TABLE polls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question TEXT NOT NULL,
  options TEXT[] NOT NULL,
  votes INTEGER[] DEFAULT ARRAY[]::INTEGER[], -- Keep for backward compatibility
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_public BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  allow_multiple_votes BOOLEAN DEFAULT false,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Votes table for individual vote tracking
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL,
  voter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (poll_id, voter_id) -- One vote per user per poll (unless multiple votes allowed)
);

-- Create indexes for performance
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

-- Function to update poll vote counts automatically
CREATE OR REPLACE FUNCTION update_poll_vote_counts()
RETURNS TRIGGER AS $$
DECLARE
  poll_uuid UUID;
BEGIN
  -- Get the poll_id from the trigger
  poll_uuid := COALESCE(NEW.poll_id, OLD.poll_id);
  
  -- Update the votes array in the polls table
  UPDATE polls 
  SET votes = (
    SELECT COALESCE(
      array_agg(
        CASE 
          WHEN vote_counts.option_index IS NOT NULL THEN vote_counts.vote_count 
          ELSE 0 
        END
      ), 
      ARRAY[]::INTEGER[]
    )
    FROM (
      SELECT 
        generate_series(0, array_length(polls.options, 1) - 1) as option_index,
        COALESCE(vote_counts.vote_count, 0) as vote_count
      FROM polls
      LEFT JOIN (
        SELECT 
          option_index,
          COUNT(*) as vote_count
        FROM votes 
        WHERE poll_id = poll_uuid
        GROUP BY option_index
      ) vote_counts ON generate_series(0, array_length(polls.options, 1) - 1) = vote_counts.option_index
      WHERE polls.id = poll_uuid
    ) vote_counts
  )
  WHERE id = poll_uuid;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update vote counts
CREATE TRIGGER update_poll_votes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION update_poll_vote_counts();

-- Function to check voting eligibility
CREATE OR REPLACE FUNCTION can_user_vote(poll_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  poll_record polls%ROWTYPE;
  existing_votes_count INTEGER;
BEGIN
  -- Get poll details
  SELECT * INTO poll_record FROM polls WHERE id = poll_uuid;
  
  -- Check if poll exists and is active
  IF NOT FOUND OR NOT poll_record.is_active THEN
    RETURN FALSE;
  END IF;
  
  -- Check if poll has expired
  IF poll_record.expires_at IS NOT NULL AND poll_record.expires_at < NOW() THEN
    RETURN FALSE;
  END IF;
  
  -- Count existing votes by this user
  SELECT COUNT(*) INTO existing_votes_count 
  FROM votes 
  WHERE poll_id = poll_uuid AND voter_id = user_uuid;
  
  -- If multiple votes not allowed and user already voted, deny
  IF NOT poll_record.allow_multiple_votes AND existing_votes_count > 0 THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get poll results
CREATE OR REPLACE FUNCTION get_poll_results(poll_uuid UUID)
RETURNS TABLE (
  poll_id UUID,
  question TEXT,
  options TEXT[],
  vote_counts INTEGER[],
  total_votes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN,
  allow_multiple_votes BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.question,
    p.options,
    COALESCE(p.votes, ARRAY[]::INTEGER[]) as vote_counts,
    COALESCE(array_sum(p.votes), 0) as total_votes,
    p.created_at,
    p.expires_at,
    p.is_active,
    p.allow_multiple_votes
  FROM polls p
  WHERE p.id = poll_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to sum array elements
CREATE OR REPLACE FUNCTION array_sum(arr INTEGER[])
RETURNS INTEGER AS $$
DECLARE
  result INTEGER := 0;
  element INTEGER;
BEGIN
  IF arr IS NULL THEN
    RETURN 0;
  END IF;
  
  FOREACH element IN ARRAY arr
  LOOP
    result := result + element;
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- View for public poll statistics
CREATE VIEW public_poll_stats AS
SELECT 
  p.id,
  p.question,
  p.options,
  COALESCE(p.votes, ARRAY[]::INTEGER[]) as vote_counts,
  COALESCE(array_sum(p.votes), 0) as total_votes,
  p.created_at,
  p.expires_at,
  p.is_active,
  p.allow_multiple_votes,
  u.name as author_name
FROM polls p
LEFT JOIN auth.users u ON p.created_by = u.id
WHERE p.is_public = true AND p.is_active = true;

-- Grant permissions
GRANT SELECT ON public_poll_stats TO authenticated;
GRANT SELECT ON public_poll_stats TO anon;
