# Row Level Security (RLS) Policies for YOU.OS

This document contains the SQL statements to enable Row Level Security on your Supabase database.

## Overview

RLS policies ensure:
- Users can only access their own data
- Company employees can access company-related data
- Admins have full access where needed
- Multi-tenant isolation is enforced at the database level

## Enable RLS on All Tables

Run these in your Supabase SQL Editor:

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_brains ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_brain_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_all_jobs ENABLE ROW LEVEL SECURITY;
```

## User Policies

### Users Table

```sql
-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid()::text = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid()::text = id);

-- Service role can do anything (for backend)
CREATE POLICY "Service role full access on users"
  ON users FOR ALL
  USING (auth.role() = 'service_role');
```

### Identity Brains

```sql
-- Users can CRUD their own identity brain
CREATE POLICY "Users can view own identity brain"
  ON identity_brains FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create own identity brain"
  ON identity_brains FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own identity brain"
  ON identity_brains FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own identity brain"
  ON identity_brains FOR DELETE
  USING (auth.uid()::text = user_id);
```

### Identity Brain Versions

```sql
-- Users can view versions of their own brain
CREATE POLICY "Users can view own brain versions"
  ON identity_brain_versions FOR SELECT
  USING (
    brain_id IN (
      SELECT id FROM identity_brains WHERE user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can create own brain versions"
  ON identity_brain_versions FOR INSERT
  WITH CHECK (
    brain_id IN (
      SELECT id FROM identity_brains WHERE user_id = auth.uid()::text
    )
  );
```

### Personas

```sql
-- Users can CRUD their own personas
CREATE POLICY "Users can view own personas"
  ON personas FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create own personas"
  ON personas FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own personas"
  ON personas FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own personas"
  ON personas FOR DELETE
  USING (auth.uid()::text = user_id);
```

### Photos

```sql
-- Users can CRUD their own photos
CREATE POLICY "Users can view own photos"
  ON photos FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can upload own photos"
  ON photos FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own photos"
  ON photos FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own photos"
  ON photos FOR DELETE
  USING (auth.uid()::text = user_id);
```

### Generated Content

```sql
-- Users can CRUD their own generated content
CREATE POLICY "Users can view own content"
  ON generated_content FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create own content"
  ON generated_content FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own content"
  ON generated_content FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own content"
  ON generated_content FOR DELETE
  USING (auth.uid()::text = user_id);
```

### Feedback

```sql
-- Users can CRUD their own feedback
CREATE POLICY "Users can view own feedback"
  ON feedback FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create feedback"
  ON feedback FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);
```

### Sync Events & Jobs

```sql
-- Users can view their own sync events
CREATE POLICY "Users can view own sync events"
  ON sync_events FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can view own sync jobs"
  ON sync_all_jobs FOR SELECT
  USING (auth.uid()::text = user_id);
```

## Company/Multi-Tenant Policies

### Companies

```sql
-- Company owners and admins can manage their company
CREATE POLICY "Company admins can view company"
  ON companies FOR SELECT
  USING (
    id IN (
      SELECT company_id FROM company_employees
      WHERE user_id = auth.uid()::text AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Company owners can update company"
  ON companies FOR UPDATE
  USING (
    id IN (
      SELECT company_id FROM company_employees
      WHERE user_id = auth.uid()::text AND role = 'owner'
    )
  );
```

### Company Employees

```sql
-- Company admins can view employees
CREATE POLICY "Company admins can view employees"
  ON company_employees FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_employees
      WHERE user_id = auth.uid()::text AND role IN ('owner', 'admin')
    )
  );

-- Users can view their own employee record
CREATE POLICY "Users can view own employee record"
  ON company_employees FOR SELECT
  USING (auth.uid()::text = user_id);

-- Company owners can manage employees
CREATE POLICY "Company owners can manage employees"
  ON company_employees FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM company_employees
      WHERE user_id = auth.uid()::text AND role = 'owner'
    )
  );
```

### Company Invites

```sql
-- Company admins can view and create invites
CREATE POLICY "Company admins can view invites"
  ON company_invites FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_employees
      WHERE user_id = auth.uid()::text AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Company admins can create invites"
  ON company_invites FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_employees
      WHERE user_id = auth.uid()::text AND role IN ('owner', 'admin')
    )
  );

-- Anyone with invite token can view that specific invite (for accepting)
CREATE POLICY "Anyone can view invite by token"
  ON company_invites FOR SELECT
  USING (true);  -- Token validation done in application layer
```

## Service Role Bypass

The backend uses the `service_role` key which bypasses RLS. This is intentional as the application layer handles authorization.

```sql
-- Example: Allow service role full access (already default behavior)
-- This is just for documentation - service_role bypasses RLS automatically
```

## Storage Policies (Supabase Storage)

For the `photos` bucket:

```sql
-- In Supabase Dashboard > Storage > Policies

-- Allow users to upload to their own folder
CREATE POLICY "Users can upload to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to view their own photos
CREATE POLICY "Users can view own photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to delete their own photos
CREATE POLICY "Users can delete own photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

## Applying Policies

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy and paste the SQL statements above
3. Run them in order (Enable RLS first, then policies)
4. Test with your application

## Testing RLS

You can test policies using:

```sql
-- Test as a specific user
SET request.jwt.claims = '{"sub": "user-id-here"}';
SELECT * FROM identity_brains;  -- Should only return that user's data

-- Reset
RESET request.jwt.claims;
```

## Important Notes

1. **Service Role Key**: Your backend uses the `service_role` key which bypasses RLS. This is intentional - authorization is handled in the application layer.

2. **Direct Database Access**: If users ever get direct database access (e.g., through Supabase client with anon key), RLS protects their data.

3. **Performance**: RLS policies add overhead. The policies above use efficient patterns with indexed columns.

4. **Soft Deletes**: Tables with `deleted_at` should include `AND deleted_at IS NULL` in SELECT policies if you want to hide soft-deleted records.
