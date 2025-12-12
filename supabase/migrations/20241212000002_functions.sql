-- YOU.OS Database Functions
-- Utility functions for identity brain versioning, triggers, etc.

-- ===========================================
-- UPDATED_AT TRIGGER FUNCTION
-- ===========================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- CREATE IDENTITY BRAIN VERSION
-- Auto-creates a version snapshot before updating identity brain
-- ===========================================

CREATE OR REPLACE FUNCTION create_identity_version()
RETURNS TRIGGER AS $$
DECLARE
  max_auto_versions INTEGER := 5;
  current_auto_count INTEGER;
BEGIN
  -- Only create version if core attributes actually changed
  IF OLD.core_attributes IS DISTINCT FROM NEW.core_attributes
     OR OLD.aesthetic_state IS DISTINCT FROM NEW.aesthetic_state
     OR OLD.learning_state IS DISTINCT FROM NEW.learning_state THEN

    -- Insert the version
    INSERT INTO identity_brain_versions (
      identity_brain_id,
      version_number,
      version_type,
      core_attributes,
      aesthetic_state,
      learning_state,
      identity_embedding,
      content_embedding
    ) VALUES (
      OLD.id,
      OLD.current_version,
      'auto',
      OLD.core_attributes,
      OLD.aesthetic_state,
      OLD.learning_state,
      OLD.identity_embedding,
      OLD.content_embedding
    );

    -- Increment version number
    NEW.current_version := OLD.current_version + 1;

    -- Clean up old auto versions (keep last 5)
    SELECT COUNT(*) INTO current_auto_count
    FROM identity_brain_versions
    WHERE identity_brain_id = OLD.id AND version_type = 'auto';

    IF current_auto_count > max_auto_versions THEN
      DELETE FROM identity_brain_versions
      WHERE id IN (
        SELECT id FROM identity_brain_versions
        WHERE identity_brain_id = OLD.id AND version_type = 'auto'
        ORDER BY created_at ASC
        LIMIT (current_auto_count - max_auto_versions)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- ROLLBACK IDENTITY BRAIN
-- Restores identity brain to a specific version
-- ===========================================

CREATE OR REPLACE FUNCTION rollback_identity_brain(
  p_identity_brain_id UUID,
  p_version_number INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_version RECORD;
BEGIN
  -- Get the version to restore
  SELECT * INTO v_version
  FROM identity_brain_versions
  WHERE identity_brain_id = p_identity_brain_id
    AND version_number = p_version_number;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Version % not found for identity brain %', p_version_number, p_identity_brain_id;
  END IF;

  -- Update identity brain with version data
  -- Note: This will trigger create_identity_version, saving current state first
  UPDATE identity_brains
  SET
    core_attributes = v_version.core_attributes,
    aesthetic_state = v_version.aesthetic_state,
    learning_state = v_version.learning_state,
    identity_embedding = v_version.identity_embedding,
    content_embedding = v_version.content_embedding,
    updated_at = NOW()
  WHERE id = p_identity_brain_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- CREATE IDENTITY SNAPSHOT
-- Creates a manual snapshot with a custom name
-- ===========================================

CREATE OR REPLACE FUNCTION create_identity_snapshot(
  p_identity_brain_id UUID,
  p_snapshot_name TEXT
)
RETURNS UUID AS $$
DECLARE
  v_brain RECORD;
  v_version_id UUID;
BEGIN
  -- Get current identity brain state
  SELECT * INTO v_brain
  FROM identity_brains
  WHERE id = p_identity_brain_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Identity brain % not found', p_identity_brain_id;
  END IF;

  -- Insert manual version
  INSERT INTO identity_brain_versions (
    identity_brain_id,
    version_number,
    version_type,
    snapshot_name,
    core_attributes,
    aesthetic_state,
    learning_state,
    identity_embedding,
    content_embedding
  ) VALUES (
    v_brain.id,
    v_brain.current_version,
    'manual',
    p_snapshot_name,
    v_brain.core_attributes,
    v_brain.aesthetic_state,
    v_brain.learning_state,
    v_brain.identity_embedding,
    v_brain.content_embedding
  )
  RETURNING id INTO v_version_id;

  RETURN v_version_id;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- BLEND EMBEDDINGS
-- Combines identity and content embeddings with 80/20 ratio
-- ===========================================

CREATE OR REPLACE FUNCTION blend_embeddings(
  identity_emb vector(1536),
  content_emb vector(1536),
  identity_weight FLOAT DEFAULT 0.8
)
RETURNS vector(1536) AS $$
DECLARE
  content_weight FLOAT;
  result vector(1536);
BEGIN
  content_weight := 1.0 - identity_weight;

  -- If either is null, return the other (or null if both null)
  IF identity_emb IS NULL THEN
    RETURN content_emb;
  END IF;

  IF content_emb IS NULL THEN
    RETURN identity_emb;
  END IF;

  -- Weighted blend
  result := (identity_emb * identity_weight) + (content_emb * content_weight);

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- GET NEXT SYNC SEQUENCE NUMBER
-- Returns the next sequence number for sync events
-- ===========================================

CREATE OR REPLACE FUNCTION get_next_sync_sequence(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  next_seq INTEGER;
BEGIN
  SELECT COALESCE(MAX(sequence_number), 0) + 1 INTO next_seq
  FROM sync_events
  WHERE user_id = p_user_id;

  RETURN next_seq;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- CALCULATE TIME DECAY WEIGHT
-- Calculates decay weight for feedback based on age
-- ===========================================

CREATE OR REPLACE FUNCTION calculate_decay_weight(
  feedback_date TIMESTAMPTZ,
  half_life_days INTEGER DEFAULT 30
)
RETURNS FLOAT AS $$
DECLARE
  days_old FLOAT;
  decay_weight FLOAT;
BEGIN
  days_old := EXTRACT(EPOCH FROM (NOW() - feedback_date)) / 86400.0;

  -- Exponential decay: weight = 2^(-days/half_life)
  decay_weight := POWER(2, -days_old / half_life_days);

  -- Clamp to [0.01, 1.0]
  RETURN GREATEST(0.01, LEAST(1.0, decay_weight));
END;
$$ LANGUAGE plpgsql;
