# YOU.OS API - Deployment Guide

## Coolify Deployment

This guide covers deploying YOU.OS API on Coolify with Supabase.

### Prerequisites

- Coolify installed on your VPS
- Domain configured (optional, for HTTPS)
- AI API keys (Google AI, OpenAI)

---

## Option 1: Self-Hosted Supabase + Backend (Recommended)

### Step 1: Deploy Supabase

1. In Coolify, go to **Projects** → Create new project (e.g., `youos`)

2. Add Supabase service:
   - Click **+ New** → **Services** → Search for **Supabase**
   - Select the official Supabase template
   - Configure environment variables:
     ```
     POSTGRES_PASSWORD=your-secure-password
     JWT_SECRET=your-jwt-secret-min-32-chars
     ANON_KEY=your-generated-anon-key
     SERVICE_ROLE_KEY=your-generated-service-role-key
     ```

3. Start Supabase services

4. Note the internal service URLs:
   - Kong API Gateway: `http://supabase-kong:8000`
   - PostgreSQL: `postgresql://postgres:password@supabase-db:5432/postgres`

### Step 2: Deploy YOU.OS API

1. In the same project, click **+ New** → **Application**

2. Select **Dockerfile** as build pack

3. Connect your Git repository or use:
   - **Public repository**: `https://github.com/your-repo/youos-api`
   - **Private repository**: Configure deploy key

4. Configure build settings:
   - **Build Pack**: Dockerfile
   - **Dockerfile Location**: `Dockerfile`
   - **Port**: `3000`

5. Add environment variables (Settings → Environment Variables):
   ```
   NODE_ENV=production
   PORT=3000
   HOST=0.0.0.0

   # Point to internal Supabase services
   SUPABASE_URL=http://supabase-kong:8000
   DATABASE_URL=postgresql://postgres:your-password@supabase-db:5432/postgres

   # From Supabase setup
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

   # AI Keys
   GOOGLE_AI_API_KEY=your-google-ai-key
   OPENAI_API_KEY=your-openai-key

   # Optional
   BANANA_API_KEY=
   SUPABASE_STORAGE_BUCKET=photos
   RATE_LIMIT_MAX=100
   RATE_LIMIT_WINDOW_MS=60000
   SYNC_COOLDOWN_MS=300000
   SYNC_TIMEOUT_MS=60000
   ```

6. Configure domain (optional):
   - Settings → Domains
   - Add `api.youos.app` or your domain

7. Deploy the application

### Step 3: Run Database Migrations

After deployment, connect to the container and run migrations:

```bash
# Via Coolify terminal or SSH
docker exec -it youos-api sh

# Inside container
bun db:push
```

Or create a one-time job in Coolify to run migrations.

---

## Option 2: Supabase Cloud + Self-Hosted Backend

If you prefer using Supabase Cloud:

### Step 1: Set Up Supabase Cloud

1. Create project at [supabase.com](https://supabase.com)
2. Note your project credentials:
   - Project URL: `https://xxx.supabase.co`
   - Anon Key
   - Service Role Key
   - Database connection string (use pooler for production)

### Step 2: Deploy Backend

Follow Step 2 from Option 1, but use Supabase Cloud URLs:

```
SUPABASE_URL=https://xxx.supabase.co
DATABASE_URL=postgresql://postgres.xxx:password@aws-0-region.pooler.supabase.com:6543/postgres
```

---

## Health Check

The API includes a health endpoint:

```bash
curl https://api.youos.app/api/v1/health
```

Expected response:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "0.1.0",
    "timestamp": "2025-12-16T..."
  }
}
```

---

## Networking Notes

### Internal Communication (Same Coolify Project)

Services in the same Coolify project can communicate via container names:
- `supabase-kong:8000` - Supabase API Gateway
- `supabase-db:5432` - PostgreSQL database
- `youos-api:3000` - Backend API

### External Access

Configure domains in Coolify for external access with automatic SSL.

---

## Troubleshooting

### Container won't start

1. Check logs in Coolify dashboard
2. Verify environment variables are set
3. Ensure Supabase is running first

### Database connection errors

1. Verify DATABASE_URL is correct
2. For self-hosted: Use internal container name (`supabase-db`)
3. For Supabase Cloud: Use pooler URL for production

### AI API errors

1. Verify API keys are valid
2. Check rate limits on your AI provider accounts

### Migration issues

Run migrations manually:
```bash
docker exec -it youos-api bun db:push
```

---

## Production Checklist

- [ ] Secure passwords and API keys
- [ ] Configure domain with HTTPS
- [ ] Set up database backups
- [ ] Configure rate limiting appropriately
- [ ] Set up monitoring (Sentry DSN in future)
- [ ] Test health endpoint
- [ ] Verify all API endpoints work
- [ ] Configure CORS for frontend domain

---

## Resource Requirements

Minimum recommended:
- **CPU**: 1 vCPU
- **RAM**: 1GB (2GB recommended with Supabase)
- **Storage**: 10GB (more for photos storage)

---

## Updates

To update the deployment:

1. Push changes to your Git repository
2. Coolify will auto-deploy (if configured) or manually trigger deploy
3. Run migrations if schema changed: `bun db:push`
