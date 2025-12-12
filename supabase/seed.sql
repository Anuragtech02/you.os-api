-- YOU.OS Seed Data
-- This file runs after migrations during db reset

-- Insert default system settings
INSERT INTO system_settings (key, value, description, category, is_public)
VALUES
  ('app_name', '"YOU.OS"', 'Application name', 'general', true),
  ('app_version', '"0.1.0"', 'Application version', 'general', true),
  ('max_photos_per_user', '50', 'Maximum photos per user', 'limits', false),
  ('max_bios_per_user', '100', 'Maximum bios per user', 'limits', false),
  ('sync_cooldown_seconds', '300', 'Cooldown between sync operations', 'sync', false),
  ('ai_models', '{"text": "gemini-2.5-flash", "vision": "gemini-2.5-flash-preview-image-generation", "embedding": "text-embedding-3-small", "fallback": "gpt-5-mini"}', 'AI model configuration', 'ai', false)
ON CONFLICT (key) DO NOTHING;

-- Insert default feature flags
INSERT INTO feature_flags (key, name, description, is_enabled, target_type)
VALUES
  ('photo_enhancement', 'Photo Enhancement', 'Enable AI photo enhancement with Nano Banana', true, 'all'),
  ('multi_persona', 'Multiple Personas', 'Allow users to create multiple personas', true, 'all'),
  ('company_accounts', 'Company Accounts', 'Enable B2B company account features', true, 'all'),
  ('messaging_assist', 'Dating Messaging Assist', 'Enable AI-powered messaging suggestions', true, 'all')
ON CONFLICT (key) DO NOTHING;
