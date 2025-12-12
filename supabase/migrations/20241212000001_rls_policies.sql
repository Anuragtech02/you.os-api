-- YOU.OS RLS Policies
-- Enable Row Level Security and create access policies

-- ===========================================
-- ENABLE RLS ON ALL TABLES
-- ===========================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_brains ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_brain_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- USERS TABLE POLICIES
-- ===========================================

-- Users can read their own data
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (auth.uid() = auth_id);

-- Users can update their own data
CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = auth_id);

-- Service role can do everything (for backend)
CREATE POLICY "users_service_all" ON users
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ===========================================
-- IDENTITY BRAINS TABLE POLICIES
-- ===========================================

-- Users can read their own identity brain
CREATE POLICY "identity_brains_select_own" ON identity_brains
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Users can insert their own identity brain
CREATE POLICY "identity_brains_insert_own" ON identity_brains
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Users can update their own identity brain
CREATE POLICY "identity_brains_update_own" ON identity_brains
  FOR UPDATE USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Service role can do everything
CREATE POLICY "identity_brains_service_all" ON identity_brains
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ===========================================
-- IDENTITY BRAIN VERSIONS TABLE POLICIES
-- ===========================================

-- Users can read versions of their own identity brain
CREATE POLICY "identity_brain_versions_select_own" ON identity_brain_versions
  FOR SELECT USING (
    identity_brain_id IN (
      SELECT ib.id FROM identity_brains ib
      JOIN users u ON ib.user_id = u.id
      WHERE u.auth_id = auth.uid()
    )
  );

-- Service role can do everything
CREATE POLICY "identity_brain_versions_service_all" ON identity_brain_versions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ===========================================
-- PERSONAS TABLE POLICIES
-- ===========================================

-- Users can manage personas of their own identity brain
CREATE POLICY "personas_select_own" ON personas
  FOR SELECT USING (
    identity_brain_id IN (
      SELECT ib.id FROM identity_brains ib
      JOIN users u ON ib.user_id = u.id
      WHERE u.auth_id = auth.uid()
    )
  );

CREATE POLICY "personas_insert_own" ON personas
  FOR INSERT WITH CHECK (
    identity_brain_id IN (
      SELECT ib.id FROM identity_brains ib
      JOIN users u ON ib.user_id = u.id
      WHERE u.auth_id = auth.uid()
    )
  );

CREATE POLICY "personas_update_own" ON personas
  FOR UPDATE USING (
    identity_brain_id IN (
      SELECT ib.id FROM identity_brains ib
      JOIN users u ON ib.user_id = u.id
      WHERE u.auth_id = auth.uid()
    )
  );

CREATE POLICY "personas_delete_own" ON personas
  FOR DELETE USING (
    identity_brain_id IN (
      SELECT ib.id FROM identity_brains ib
      JOIN users u ON ib.user_id = u.id
      WHERE u.auth_id = auth.uid()
    )
  );

-- Service role can do everything
CREATE POLICY "personas_service_all" ON personas
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ===========================================
-- PHOTOS TABLE POLICIES
-- ===========================================

-- Users can manage their own photos
CREATE POLICY "photos_select_own" ON photos
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY "photos_insert_own" ON photos
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY "photos_update_own" ON photos
  FOR UPDATE USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY "photos_delete_own" ON photos
  FOR DELETE USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Service role can do everything
CREATE POLICY "photos_service_all" ON photos
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ===========================================
-- GENERATED CONTENT TABLE POLICIES
-- ===========================================

-- Users can manage their own generated content
CREATE POLICY "generated_content_select_own" ON generated_content
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY "generated_content_insert_own" ON generated_content
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY "generated_content_update_own" ON generated_content
  FOR UPDATE USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY "generated_content_delete_own" ON generated_content
  FOR DELETE USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Service role can do everything
CREATE POLICY "generated_content_service_all" ON generated_content
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ===========================================
-- CONTENT TEMPLATES TABLE POLICIES
-- ===========================================

-- Users can manage their own templates
CREATE POLICY "content_templates_select_own" ON content_templates
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY "content_templates_insert_own" ON content_templates
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY "content_templates_update_own" ON content_templates
  FOR UPDATE USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY "content_templates_delete_own" ON content_templates
  FOR DELETE USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Service role can do everything
CREATE POLICY "content_templates_service_all" ON content_templates
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ===========================================
-- SYNC EVENTS TABLE POLICIES
-- ===========================================

-- Users can read their own sync events
CREATE POLICY "sync_events_select_own" ON sync_events
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Service role can do everything
CREATE POLICY "sync_events_service_all" ON sync_events
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ===========================================
-- SYNC JOBS TABLE POLICIES
-- ===========================================

-- Users can read their own sync jobs
CREATE POLICY "sync_jobs_select_own" ON sync_jobs
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Service role can do everything
CREATE POLICY "sync_jobs_service_all" ON sync_jobs
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ===========================================
-- COMPANIES TABLE POLICIES
-- ===========================================

-- Company members can read their company
CREATE POLICY "companies_select_member" ON companies
  FOR SELECT USING (
    id IN (
      SELECT company_id FROM company_candidates cc
      JOIN users u ON cc.user_id = u.id
      WHERE u.auth_id = auth.uid() AND cc.is_active = true
    )
    OR
    owner_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Only owners can update their company
CREATE POLICY "companies_update_owner" ON companies
  FOR UPDATE USING (
    owner_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Service role can do everything
CREATE POLICY "companies_service_all" ON companies
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ===========================================
-- COMPANY CANDIDATES TABLE POLICIES
-- ===========================================

-- Company admins can manage candidates
CREATE POLICY "company_candidates_select" ON company_candidates
  FOR SELECT USING (
    company_id IN (
      SELECT c.id FROM companies c
      WHERE c.owner_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
    OR
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Service role can do everything
CREATE POLICY "company_candidates_service_all" ON company_candidates
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ===========================================
-- ADMIN TABLES POLICIES (Admin only)
-- ===========================================

-- Admin users - only service role and admins
CREATE POLICY "admin_users_service_all" ON admin_users
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Audit logs - only service role can manage
CREATE POLICY "audit_logs_service_all" ON audit_logs
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- System settings - service role can manage, public ones readable by all
CREATE POLICY "system_settings_select_public" ON system_settings
  FOR SELECT USING (is_public = true OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "system_settings_service_all" ON system_settings
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Feature flags - service role can manage
CREATE POLICY "feature_flags_service_all" ON feature_flags
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Usage metrics - users can see their own, service role can see all
CREATE POLICY "usage_metrics_select_own" ON usage_metrics
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    OR auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "usage_metrics_service_all" ON usage_metrics
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
