# WebVital Monitor Backend

Features:
- Express REST API with Swagger docs at /docs
- Prisma ORM (PostgreSQL)
- BullMQ & Redis for distributed monitoring jobs
- Email (SMTP), Slack, SMS (Twilio) notifications
- Google PageSpeed Insights integration
- JWT auth (email/password, Google OAuth token)
- Agencies/Teams, Websites, Alert Preferences, Notes, Reports (PDF)

Quick start:
1. Copy .env.example to .env and fill variables.
2. Install deps: npm install
3. Generate Prisma client and migrate (dev):
   - npx prisma generate
   - npx prisma migrate dev --name init
4. Start workers: npm run queue:workers
5. Start API: npm run dev
6. Open Swagger: http://localhost:3000/docs

Notes:
- Ensure Redis is running and REDIS_URL is set.
- Ensure PostgreSQL (Supabase) DATABASE_URL is set.
