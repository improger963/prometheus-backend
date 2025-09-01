# Environment Setup Guide

This guide explains how to set up the environment configuration for the Prometheus Backend in different scenarios.

## Quick Start

### 1. For Local Development

```bash
# Copy the development environment template
cp .env.development .env

# Start the development database with Docker
docker-compose -f docker-compose.dev.yml up postgres postgres-test -d

# Install dependencies and start the application
npm install
npm run start:dev
```

### 2. For Production Deployment

```bash
# Copy the production environment template
cp .env.production .env

# Update the .env file with your production values
# IMPORTANT: Change all default passwords and secrets!

# Build and start the application
npm run build
npm run start:prod
```

## Environment Files Explained

### `.env.example`
- **Purpose**: Template file showing all available configuration options
- **Usage**: Copy this file to `.env` and customize for your environment
- **Contains**: All possible environment variables with example values

### `.env.development` 
- **Purpose**: Optimized for local development
- **Features**: 
  - Verbose logging enabled
  - Database synchronization enabled
  - Relaxed rate limiting
  - Development-friendly JWT expiration
- **Security**: Uses weak secrets (NOT for production)

### `.env.production`
- **Purpose**: Production-ready configuration
- **Features**:
  - Minimal logging
  - Database synchronization disabled
  - Strict rate limiting
  - Short JWT expiration
- **Security**: Requires strong secrets and passwords

## Required Environment Variables

### Critical (Must be set)
```bash
DB_HOST=your-database-host
DB_USERNAME=your-database-username
DB_PASSWORD=your-database-password
DB_DATABASE=your-database-name
JWT_SECRET=your-secret-key
```

### Optional (for full functionality)
```bash
OPENAI_API_KEY=your-openai-key     # For GPT models
GROQ_API_KEY=your-groq-key         # For Groq models
MISTRAL_API_KEY=your-mistral-key   # For Mistral models
GEMINI_API_KEY=your-gemini-key     # For Google models
```

## Database Setup

### Using Docker (Recommended for Development)

```bash
# Start PostgreSQL databases
docker-compose -f docker-compose.dev.yml up postgres postgres-test -d

# Verify databases are running
docker-compose -f docker-compose.dev.yml ps
```

### Manual PostgreSQL Setup

```sql
-- Create development database
CREATE DATABASE prometheus_dev;
CREATE USER prometheus_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE prometheus_dev TO prometheus_user;

-- Create test database
CREATE DATABASE prometheus_test;
CREATE USER test_user WITH PASSWORD 'test_password';
GRANT ALL PRIVILEGES ON DATABASE prometheus_test TO test_user;
```

## Security Considerations

### Development Environment
- ✅ Use weak secrets for convenience
- ✅ Enable verbose logging
- ✅ Relax rate limiting
- ❌ Do NOT expose to the internet

### Production Environment
- ✅ Use strong, unique secrets (minimum 32 characters)
- ✅ Disable unnecessary logging
- ✅ Enable strict rate limiting
- ✅ Use HTTPS only
- ✅ Regularly rotate secrets

## Environment Variable Validation

The application validates environment variables on startup:

```typescript
// Example validation errors:
❌ JWT_SECRET must be at least 32 characters
❌ DB_HOST is required
❌ Invalid email format for ADMIN_EMAIL
✅ All environment variables are valid
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check if PostgreSQL is running
   docker-compose -f docker-compose.dev.yml ps postgres
   
   # Check logs
   docker-compose -f docker-compose.dev.yml logs postgres
   ```

2. **Invalid JWT Secret**
   ```bash
   # JWT_SECRET must be at least 32 characters
   echo \"JWT_SECRET=$(openssl rand -base64 32)\" >> .env
   ```

3. **Port Already in Use**
   ```bash
   # Change the port in .env
   PORT=3001
   
   # Or kill the process using the port
   lsof -ti:3000 | xargs kill
   ```

4. **Permission Denied (Docker Socket)**
   ```bash
   # Add user to docker group (Linux)
   sudo usermod -aG docker $USER
   
   # Or use sudo
   sudo npm run start:dev
   ```

### Health Checks

Verify your setup is working:

```bash
# Check application health
curl http://localhost:3000/health

# Check database connectivity
curl http://localhost:3000/health/ready

# Check system information
curl http://localhost:3000/health/info
```

## Environment-Specific Scripts

Add these scripts to your `package.json`:

```json
{
  \"scripts\": {
    \"start:dev\": \"NODE_ENV=development npm run start\",
    \"start:prod\": \"NODE_ENV=production npm run start\",
    \"db:setup:dev\": \"docker-compose -f docker-compose.dev.yml up postgres -d\",
    \"db:reset:dev\": \"docker-compose -f docker-compose.dev.yml down -v && docker-compose -f docker-compose.dev.yml up postgres -d\",
    \"test:setup\": \"docker-compose -f docker-compose.dev.yml up postgres-test -d\"
  }
}
```

## Best Practices

1. **Never commit `.env` files** - Add `.env*` to `.gitignore`
2. **Use different databases** for development, testing, and production
3. **Rotate secrets regularly** in production
4. **Monitor environment variables** for changes
5. **Use a secrets management system** in production (e.g., AWS Secrets Manager, HashiCorp Vault)
6. **Validate environment variables** on application startup
7. **Document all environment variables** and their purposes