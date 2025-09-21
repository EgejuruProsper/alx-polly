# Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying ALX Polly Pro to production environments. It covers infrastructure setup, security configuration, monitoring, and maintenance procedures.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Infrastructure Setup](#infrastructure-setup)
- [Application Deployment](#application-deployment)
- [Database Setup](#database-setup)
- [Security Configuration](#security-configuration)
- [Monitoring and Logging](#monitoring-and-logging)
- [Performance Optimization](#performance-optimization)
- [Maintenance and Updates](#maintenance-and-updates)

## Prerequisites

### System Requirements

#### Minimum Requirements
- **CPU**: 2 cores, 2.4 GHz
- **RAM**: 4 GB
- **Storage**: 20 GB SSD
- **Network**: 100 Mbps

#### Recommended Requirements
- **CPU**: 4 cores, 3.0 GHz
- **RAM**: 8 GB
- **Storage**: 50 GB SSD
- **Network**: 1 Gbps

### Software Requirements

#### Node.js
- **Version**: 18.x or higher
- **Package Manager**: npm 9.x or higher
- **Runtime**: Node.js with ES modules support

#### Database
- **PostgreSQL**: 14.x or higher
- **Supabase**: Latest version
- **Redis**: 6.x or higher (for caching)

#### Web Server
- **Nginx**: 1.20 or higher
- **SSL/TLS**: TLS 1.3 support
- **HTTP/2**: HTTP/2 support

### Cloud Providers

#### Supported Platforms
- **Vercel**: Recommended for Next.js applications
- **AWS**: EC2, ECS, Lambda
- **Google Cloud**: Cloud Run, Compute Engine
- **Azure**: App Service, Container Instances
- **DigitalOcean**: Droplets, App Platform

## Infrastructure Setup

### Vercel Deployment (Recommended)

#### 1. Project Setup
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to Vercel
vercel --prod
```

#### 2. Environment Variables
Set the following environment variables in Vercel:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Application Configuration
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your_nextauth_secret
APP_URL=https://your-domain.com

# Email Configuration (Optional)
RESEND_API_KEY=your_resend_api_key
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_pass

# Analytics (Optional)
GOOGLE_ANALYTICS_ID=your_ga_id
MIXPANEL_TOKEN=your_mixpanel_token
```

#### 3. Custom Domain
1. Go to Vercel Dashboard
2. Select your project
3. Go to Settings > Domains
4. Add your custom domain
5. Configure DNS records

### AWS Deployment

#### 1. EC2 Setup
```bash
# Launch EC2 instance
aws ec2 run-instances \
  --image-id ami-0c02fb55956c7d316 \
  --instance-type t3.medium \
  --key-name your-key-pair \
  --security-group-ids sg-xxxxxxxxx \
  --subnet-id subnet-xxxxxxxxx

# Connect to instance
ssh -i your-key-pair.pem ec2-user@your-instance-ip
```

#### 2. Install Dependencies
```bash
# Update system
sudo yum update -y

# Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo yum install -y nginx
```

#### 3. Application Setup
```bash
# Clone repository
git clone https://github.com/your-username/alx-polly-pro.git
cd alx-polly-pro

# Install dependencies
npm install

# Build application
npm run build

# Start with PM2
pm2 start npm --name "alx-polly-pro" -- start
pm2 save
pm2 startup
```

### Docker Deployment

#### 1. Dockerfile
```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

#### 2. Docker Compose
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:6-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped
```

#### 3. Deploy with Docker
```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f

# Scale application
docker-compose up -d --scale app=3
```

## Database Setup

### Supabase Setup

#### 1. Create Supabase Project
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose organization and project name
4. Set database password
5. Choose region

#### 2. Database Schema
```sql
-- Run the enhanced database schema
\i database-schema-enhanced.sql

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- (Policies are included in database-schema-enhanced.sql)
```

#### 3. Environment Variables
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### PostgreSQL Setup (Alternative)

#### 1. Install PostgreSQL
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# CentOS/RHEL
sudo yum install postgresql-server postgresql-contrib
sudo postgresql-setup initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### 2. Database Configuration
```bash
# Create database
sudo -u postgres createdb alx_polly_pro

# Create user
sudo -u postgres createuser --interactive

# Set password
sudo -u postgres psql
ALTER USER your_username PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE alx_polly_pro TO your_username;
```

#### 3. Run Migrations
```bash
# Install migration tool
npm install -g db-migrate

# Run migrations
db-migrate up
```

## Security Configuration

### SSL/TLS Setup

#### 1. Let's Encrypt (Free SSL)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### 2. Nginx SSL Configuration
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Firewall Configuration

#### 1. UFW (Ubuntu)
```bash
# Enable UFW
sudo ufw enable

# Allow SSH
sudo ufw allow ssh

# Allow HTTP/HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Allow application port
sudo ufw allow 3000

# Check status
sudo ufw status
```

#### 2. iptables (CentOS/RHEL)
```bash
# Allow SSH
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# Allow HTTP/HTTPS
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Allow application port
iptables -A INPUT -p tcp --dport 3000 -j ACCEPT

# Save rules
service iptables save
```

### Security Headers

#### 1. Next.js Security Headers
```javascript
// next.config.js
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};
```

## Monitoring and Logging

### Application Monitoring

#### 1. PM2 Monitoring
```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start npm --name "alx-polly-pro" -- start

# Monitor
pm2 monit

# View logs
pm2 logs

# Restart application
pm2 restart alx-polly-pro
```

#### 2. Health Checks
```javascript
// app/api/health/route.ts
export async function GET() {
  try {
    // Check database connection
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1);

    if (error) {
      return Response.json(
        { status: 'error', message: 'Database connection failed' },
        { status: 503 }
      );
    }

    return Response.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected'
    });
  } catch (error) {
    return Response.json(
      { status: 'error', message: 'Health check failed' },
      { status: 503 }
    );
  }
}
```

### Logging Configuration

#### 1. Winston Logger
```javascript
// lib/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'alx-polly-pro' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

module.exports = logger;
```

#### 2. Log Rotation
```bash
# Install logrotate
sudo apt install logrotate

# Create logrotate config
sudo nano /etc/logrotate.d/alx-polly-pro
```

```bash
/var/log/alx-polly-pro/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reloadLogs
    endscript
}
```

### Performance Monitoring

#### 1. New Relic (Optional)
```bash
# Install New Relic
npm install newrelic

# Configure New Relic
# newrelic.js
exports.config = {
  app_name: ['ALX Polly Pro'],
  license_key: 'your_license_key',
  distributed_tracing: {
    enabled: true
  }
};
```

#### 2. Custom Metrics
```javascript
// lib/metrics.js
const prometheus = require('prom-client');

const register = new prometheus.Registry();

// Custom metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const activeUsers = new prometheus.Gauge({
  name: 'active_users_total',
  help: 'Number of active users'
});

register.registerMetric(httpRequestDuration);
register.registerMetric(activeUsers);

module.exports = { register, httpRequestDuration, activeUsers };
```

## Performance Optimization

### Caching Strategy

#### 1. Redis Caching
```javascript
// lib/cache.js
const redis = require('redis');
const client = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD
});

const cache = {
  async get(key) {
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  },

  async set(key, value, ttl = 3600) {
    await client.setex(key, ttl, JSON.stringify(value));
  },

  async del(key) {
    await client.del(key);
  }
};

module.exports = cache;
```

#### 2. Database Optimization
```sql
-- Create indexes for performance
CREATE INDEX CONCURRENTLY idx_polls_created_at ON polls(created_at);
CREATE INDEX CONCURRENTLY idx_polls_is_active ON polls(is_active);
CREATE INDEX CONCURRENTLY idx_votes_poll_id ON votes(poll_id);
CREATE INDEX CONCURRENTLY idx_votes_voter_id ON votes(voter_id);

-- Analyze tables
ANALYZE polls;
ANALYZE votes;
ANALYZE user_profiles;
```

### CDN Configuration

#### 1. Cloudflare Setup
1. Add domain to Cloudflare
2. Configure DNS records
3. Enable caching
4. Configure security settings

#### 2. AWS CloudFront
```json
{
  "Origins": [
    {
      "DomainName": "your-domain.com",
      "Id": "origin1",
      "CustomOriginConfig": {
        "HTTPPort": 80,
        "HTTPSPort": 443,
        "OriginProtocolPolicy": "https-only"
      }
    }
  ],
  "DefaultCacheBehavior": {
    "TargetOriginId": "origin1",
    "ViewerProtocolPolicy": "redirect-to-https",
    "CachePolicyId": "4135ea2d-6df8-44a3-9ef3-4cab"
  }
}
```

## Maintenance and Updates

### Backup Procedures

#### 1. Database Backup
```bash
#!/bin/bash
# backup-db.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/alx-polly-pro"
DB_NAME="alx_polly_pro"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create database backup
pg_dump -h localhost -U postgres $DB_NAME | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# Keep only last 7 days of backups
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +7 -delete

echo "Database backup completed: db_backup_$DATE.sql.gz"
```

#### 2. Application Backup
```bash
#!/bin/bash
# backup-app.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/alx-polly-pro"
APP_DIR="/var/www/alx-polly-pro"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create application backup
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz -C $APP_DIR .

# Keep only last 7 days of backups
find $BACKUP_DIR -name "app_backup_*.tar.gz" -mtime +7 -delete

echo "Application backup completed: app_backup_$DATE.tar.gz"
```

### Update Procedures

#### 1. Application Updates
```bash
#!/bin/bash
# update-app.sh

APP_DIR="/var/www/alx-polly-pro"
BACKUP_DIR="/var/backups/alx-polly-pro"

# Create backup
./backup-app.sh

# Pull latest changes
cd $APP_DIR
git pull origin main

# Install dependencies
npm install

# Build application
npm run build

# Restart application
pm2 restart alx-polly-pro

echo "Application updated successfully"
```

#### 2. Database Migrations
```bash
#!/bin/bash
# migrate-db.sh

# Run database migrations
npm run db:migrate

# Verify migration
npm run db:status

echo "Database migrations completed"
```

### Monitoring Scripts

#### 1. Health Check Script
```bash
#!/bin/bash
# health-check.sh

APP_URL="https://your-domain.com"
HEALTH_ENDPOINT="$APP_URL/api/health"

# Check application health
response=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_ENDPOINT)

if [ $response -eq 200 ]; then
    echo "Application is healthy"
    exit 0
else
    echo "Application is unhealthy (HTTP $response)"
    exit 1
fi
```

#### 2. Cron Jobs
```bash
# Add to crontab
crontab -e

# Health check every 5 minutes
*/5 * * * * /path/to/health-check.sh

# Database backup daily at 2 AM
0 2 * * * /path/to/backup-db.sh

# Application backup daily at 3 AM
0 3 * * * /path/to/backup-app.sh

# Log rotation weekly
0 0 * * 0 /path/to/logrotate.sh
```

## Troubleshooting

### Common Issues

#### 1. Application Won't Start
```bash
# Check logs
pm2 logs alx-polly-pro

# Check port availability
netstat -tlnp | grep :3000

# Check environment variables
env | grep NEXT_PUBLIC

# Restart application
pm2 restart alx-polly-pro
```

#### 2. Database Connection Issues
```bash
# Test database connection
psql -h localhost -U postgres -d alx_polly_pro -c "SELECT 1;"

# Check Supabase connection
curl -H "apikey: your_anon_key" https://your-project.supabase.co/rest/v1/

# Check environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
```

#### 3. Performance Issues
```bash
# Check system resources
htop
df -h
free -h

# Check application metrics
pm2 monit

# Check database performance
psql -h localhost -U postgres -d alx_polly_pro -c "SELECT * FROM pg_stat_activity;"
```

### Support and Resources

#### 1. Documentation
- **API Documentation**: `/docs/API.md`
- **User Guide**: `/docs/USER_GUIDE.md`
- **Security Guide**: `/docs/SECURITY.md`

#### 2. Community
- **GitHub Issues**: Report bugs and feature requests
- **Discord Community**: Real-time support and discussions
- **Stack Overflow**: Technical questions and answers

#### 3. Professional Support
- **Email Support**: support@alxpollypro.com
- **Enterprise Support**: enterprise@alxpollypro.com
- **Consulting Services**: consulting@alxpollypro.com
