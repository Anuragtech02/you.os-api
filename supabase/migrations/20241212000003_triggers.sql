-- YOU.OS Database Triggers
-- Automatic timestamp updates and versioning

-- ===========================================
-- UPDATED_AT TRIGGERS
-- ===========================================

-- Users
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Identity Brains (before version trigger)
CREATE TRIGGER identity_brains_updated_at
  BEFORE UPDATE ON identity_brains
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Personas
CREATE TRIGGER personas_updated_at
  BEFORE UPDATE ON personas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Photos
CREATE TRIGGER photos_updated_at
  BEFORE UPDATE ON photos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Generated Content
CREATE TRIGGER generated_content_updated_at
  BEFORE UPDATE ON generated_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Content Templates
CREATE TRIGGER content_templates_updated_at
  BEFORE UPDATE ON content_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Companies
CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Company Candidates
CREATE TRIGGER company_candidates_updated_at
  BEFORE UPDATE ON company_candidates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Admin Users
CREATE TRIGGER admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Feature Flags
CREATE TRIGGER feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- System Settings
CREATE TRIGGER system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===========================================
-- IDENTITY BRAIN VERSION TRIGGER
-- ===========================================

-- Auto-create version on identity brain update
CREATE TRIGGER identity_brains_version_trigger
  BEFORE UPDATE ON identity_brains
  FOR EACH ROW EXECUTE FUNCTION create_identity_version();

-- ===========================================
-- USER CREATION TRIGGER
-- Creates identity brain automatically when user is created
-- ===========================================

CREATE OR REPLACE FUNCTION create_user_identity_brain()
RETURNS TRIGGER AS $$
BEGIN
  -- Create identity brain for new user
  INSERT INTO identity_brains (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_create_identity_brain
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION create_user_identity_brain();

-- ===========================================
-- DEFAULT PERSONAS TRIGGER
-- Creates default personas when identity brain is created
-- ===========================================

CREATE OR REPLACE FUNCTION create_default_personas()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default personas
  INSERT INTO personas (identity_brain_id, persona_type, name, description)
  VALUES
    (NEW.id, 'professional', 'Professional', 'For work and career contexts'),
    (NEW.id, 'dating', 'Dating', 'For dating and romantic contexts'),
    (NEW.id, 'social', 'Social', 'For social media and casual contexts'),
    (NEW.id, 'private', 'Private', 'Personal and private contexts');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER identity_brains_create_personas
  AFTER INSERT ON identity_brains
  FOR EACH ROW EXECUTE FUNCTION create_default_personas();
