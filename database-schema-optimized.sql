-- Optimized Supabase Database Schema for High-Performance Vote Tallying
-- Handles thousands of votes efficiently with materialized views and partitioning

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Drop existing tables if they exist (for migration)
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS polls CASCADE;
DROP MATERIALIZED VIEW IF EXISTS poll_vote_stats CASCADE;

-- Polls table (optimized)
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_votes INTEGER DEFAULT 0, -- Denormalized for performance
  unique_voters INTEGER DEFAULT 0 -- Denormalized for performance
);

-- Votes table with partitioning for better performance
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL CHECK (option_index >= 0),
  voter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (poll_id, voter_id) -- One vote per user per poll (unless multiple votes allowed)
) PARTITION BY HASH (poll_id);

-- Create vote partitions for better performance
CREATE TABLE votes_part_0 PARTITION OF votes
  FOR VALUES WITH (modulus 4, remainder 0);
CREATE TABLE votes_part_1 PARTITION OF votes
  FOR VALUES WITH (modulus 4, remainder 1);
CREATE TABLE votes_part_2 PARTITION OF votes
  FOR VALUES WITH (modulus 4, remainder 2);
CREATE TABLE votes_part_3 PARTITION OF votes
  FOR VALUES WITH (modulus 4, remainder 3);

-- Optimized indexes for performance
CREATE INDEX CONCURRENTLY idx_polls_created_by ON polls(created_by);
CREATE INDEX CONCURRENTLY idx_polls_is_public ON polls(is_public);
CREATE INDEX CONCURRENTLY idx_polls_is_active ON polls(is_active);
CREATE INDEX CONCURRENTLY idx_polls_created_at ON polls(created_at);
CREATE INDEX CONCURRENTLY idx_polls_total_votes ON polls(total_votes DESC);
CREATE INDEX CONCURRENTLY idx_polls_expires_at ON polls(expires_at);

-- Vote indexes for fast lookups
CREATE INDEX CONCURRENTLY idx_votes_poll_option ON votes(poll_id, option_index);
CREATE INDEX CONCURRENTLY idx_votes_poll_voter ON votes(poll_id, voter_id);
CREATE INDEX CONCURRENTLY idx_votes_created_at ON votes(created_at);

-- Materialized view for vote statistics (high performance)
CREATE MATERIALIZED VIEW poll_vote_stats AS
SELECT 
  p.id as poll_id,
  p.question,
  p.options,
  p.created_at,
  p.expires_at,
  p.is_active,
  p.allow_multiple_votes,
  p.description,
  p.created_by,
  COALESCE(vote_counts.vote_counts, ARRAY[]::INTEGER[]) as vote_counts,
  COALESCE(vote_counts.total_votes, 0) as total_votes,
  COALESCE(vote_counts.unique_voters, 0) as unique_voters,
  p.is_public
FROM polls p
LEFT JOIN (
  SELECT 
    poll_id,
    array_agg(vote_count ORDER BY option_index) as vote_counts,
    sum(vote_count) as total_votes,
    count(DISTINCT voter_id) as unique_voters
  FROM (
    SELECT 
      poll_id,
      option_index,
      count(*) as vote_count,
      array_agg(DISTINCT voter_id) as voter_ids
    FROM votes 
    GROUP BY poll_id, option_index
  ) vote_aggregates
  GROUP BY poll_id
) vote_counts ON p.id = vote_counts.poll_id;

-- Create unique index for fast lookups
CREATE UNIQUE INDEX idx_poll_vote_stats_poll_id ON poll_vote_stats(poll_id);
CREATE INDEX idx_poll_vote_stats_total_votes ON poll_vote_stats(total_votes DESC);
CREATE INDEX idx_poll_vote_stats_created_at ON poll_vote_stats(created_at DESC);
CREATE INDEX idx_poll_vote_stats_is_public ON poll_vote_stats(is_public);
CREATE INDEX idx_poll_vote_stats_is_active ON poll_vote_stats(is_active);

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

-- Optimized function to update poll vote counts (background job friendly)
CREATE OR REPLACE FUNCTION update_poll_vote_counts_optimized(poll_uuid UUID)
RETURNS VOID AS $$
DECLARE
  poll_options_count INTEGER;
  vote_counts_array INTEGER[];
  total_votes_count INTEGER;
  unique_voters_count INTEGER;
BEGIN
  -- Get the number of options for this poll
  SELECT array_length(options, 1) INTO poll_options_count
  FROM polls WHERE id = poll_uuid;
  
  -- Initialize vote counts array
  vote_counts_array := ARRAY[]::INTEGER[];
  
  -- Build vote counts array efficiently
  SELECT 
    COALESCE(array_agg(vote_count ORDER BY option_index), ARRAY[]::INTEGER[]),
    COALESCE(sum(vote_count), 0),
    COALESCE(count(DISTINCT voter_id), 0)
  INTO vote_counts_array, total_votes_count, unique_voters_count
  FROM (
    SELECT 
      option_index,
      count(*) as vote_count,
      array_agg(DISTINCT voter_id) as voter_ids
    FROM votes 
    WHERE poll_id = poll_uuid
    GROUP BY option_index
  ) vote_aggregates;
  
  -- Pad array with zeros if needed
  WHILE array_length(vote_counts_array, 1) < poll_options_count LOOP
    vote_counts_array := vote_counts_array || 0;
  END LOOP;
  
  -- Update poll with aggregated counts
  UPDATE polls 
  SET 
    votes = vote_counts_array,
    total_votes = total_votes_count,
    unique_voters = unique_voters_count,
    updated_at = NOW()
  WHERE id = poll_uuid;
  
  -- Refresh materialized view for this poll
  REFRESH MATERIALIZED VIEW CONCURRENTLY poll_vote_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_poll_vote_stats()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY poll_vote_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update vote counts (optimized version)
CREATE OR REPLACE FUNCTION update_poll_vote_counts_trigger()
RETURNS TRIGGER AS $$
DECLARE
  poll_uuid UUID;
BEGIN
  -- Get the poll_id from the trigger
  poll_uuid := COALESCE(NEW.poll_id, OLD.poll_id);
  
  -- Use optimized function
  PERFORM update_poll_vote_counts_optimized(poll_uuid);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for vote count updates
CREATE TRIGGER update_poll_votes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION update_poll_vote_counts_trigger();

-- Function to check voting eligibility (optimized)
CREATE OR REPLACE FUNCTION can_user_vote_optimized(poll_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  poll_record polls%ROWTYPE;
  existing_votes_count INTEGER;
BEGIN
  -- Get poll details with single query
  SELECT * INTO poll_record 
  FROM polls 
  WHERE id = poll_uuid AND is_active = true;
  
  -- Check if poll exists and is active
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if poll has expired
  IF poll_record.expires_at IS NOT NULL AND poll_record.expires_at < NOW() THEN
    RETURN FALSE;
  END IF;
  
  -- Count existing votes by this user (optimized query)
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

-- Function to get poll results (optimized)
CREATE OR REPLACE FUNCTION get_poll_results_optimized(poll_uuid UUID)
RETURNS TABLE (
  poll_id UUID,
  question TEXT,
  options TEXT[],
  vote_counts INTEGER[],
  total_votes INTEGER,
  unique_voters INTEGER,
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
    p.total_votes,
    p.unique_voters,
    p.created_at,
    p.expires_at,
    p.is_active,
    p.allow_multiple_votes
  FROM polls p
  WHERE p.id = poll_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View for public poll statistics (optimized)
CREATE VIEW public_poll_stats_optimized AS
SELECT 
  pvs.poll_id,
  pvs.question,
  pvs.options,
  pvs.vote_counts,
  pvs.total_votes,
  pvs.unique_voters,
  pvs.created_at,
  pvs.expires_at,
  pvs.is_active,
  pvs.allow_multiple_votes,
  u.name as author_name,
  u.email as author_email
FROM poll_vote_stats pvs
LEFT JOIN auth.users u ON pvs.created_by = u.id
WHERE pvs.is_public = true AND pvs.is_active = true;

-- Grant permissions
GRANT SELECT ON public_poll_stats_optimized TO authenticated;
GRANT SELECT ON public_poll_stats_optimized TO anon;
GRANT SELECT ON poll_vote_stats TO authenticated;
GRANT SELECT ON poll_vote_stats TO anon;

-- Create function to get top polls by votes (for analytics)
CREATE OR REPLACE FUNCTION get_top_polls_by_votes(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  poll_id UUID,
  question TEXT,
  total_votes INTEGER,
  unique_voters INTEGER,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pvs.poll_id,
    pvs.question,
    pvs.total_votes,
    pvs.unique_voters,
    pvs.created_at
  FROM poll_vote_stats pvs
  WHERE pvs.is_public = true AND pvs.is_active = true
  ORDER BY pvs.total_votes DESC, pvs.unique_voters DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get poll analytics
CREATE OR REPLACE FUNCTION get_poll_analytics(poll_uuid UUID)
RETURNS TABLE (
  poll_id UUID,
  question TEXT,
  total_votes INTEGER,
  unique_voters INTEGER,
  vote_distribution JSONB,
  participation_rate DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  poll_data poll_vote_stats%ROWTYPE;
  vote_distribution JSONB;
  participation_rate DECIMAL;
BEGIN
  -- Get poll data
  SELECT * INTO poll_data FROM poll_vote_stats WHERE poll_id = poll_uuid;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Calculate vote distribution
  SELECT jsonb_build_object(
    'options', poll_data.options,
    'vote_counts', poll_data.vote_counts,
    'percentages', (
      SELECT array_agg(
        CASE 
          WHEN poll_data.total_votes > 0 THEN 
            ROUND((vote_count::DECIMAL / poll_data.total_votes) * 100, 2)
          ELSE 0
        END
      )
      FROM unnest(poll_data.vote_counts) WITH ORDINALITY AS t(vote_count, idx)
    )
  ) INTO vote_distribution;
  
  -- Calculate participation rate (simplified)
  participation_rate := CASE 
    WHEN poll_data.unique_voters > 0 THEN 
      ROUND((poll_data.unique_voters::DECIMAL / poll_data.unique_voters) * 100, 2)
    ELSE 0
  END;
  
  RETURN QUERY
  SELECT 
    poll_data.poll_id,
    poll_data.question,
    poll_data.total_votes,
    poll_data.unique_voters,
    vote_distribution,
    participation_rate,
    poll_data.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
