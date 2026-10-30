# House M8 Backend Documentation

## Overview

The House M8 backend is built using **Nuxt 4** with **Nitro** server, providing a modern, scalable API for roommate expense management. The backend follows a clean architecture with repository pattern, JWT authentication, and PostgreSQL database.

## Architecture

### Server Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Nuxt 4 Application                       │
├─────────────────────────────────────────────────────────────┤
│  Nitro Server (API Routes, Middleware, Plugins)           │
├─────────────────────────────────────────────────────────────┤
│  Repository Layer (Business Logic & Data Access)          │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL Database (Data Persistence)                   │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

- **API Routes**: File-based routing using Nuxt's convention (`server/api/`)
- **Repositories**: Data access layer with PostgreSQL implementations
- **Auth Providers**: Authentication handling (JWT + OAuth)
- **Email System**: Template-based email notifications
- **Middleware**: Request processing and authentication

### Repository Pattern

The backend uses a repository pattern for data access:

```typescript
// Repository interface
interface IUserRepository {
  getById(id: string): Promise<User | null>;
  create(data: CreateUserData): Promise<User>;
  // ...
}

// PostgreSQL implementation
class PostgresUserRepository implements IUserRepository {
  constructor(private pool: Pool) {}

  async getById(id: string): Promise<User | null> {
    const result = await this.pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  }
  // ...
}
```

## Database Schema

### Core Tables

| Table | Description |
|-------|-------------|
| `users` | User profiles and authentication data |
| `houses` | Shared houses/apartments |
| `house_members` | Membership relationships |
| `expenses` | Shared expenses |
| `expense_shares` | Individual expense shares |
| `bills` | Recurring bills |
| `bulletin_notes` | House announcements |
| `reports` | Issue reports (members → owners) |
| `oauth_tokens` | OAuth provider tokens |

### Authentication Tables

| Table | Description |
|-------|-------------|
| `house_invitations` | House join invitations |
| `email_verification_tokens` | Email verification |
| `password_reset_tokens` | Password reset functionality |

## API Endpoints

### Authentication (`/api/auth/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/resend-confirmation` | Mail a fresh sign-up link to an unconfirmed account (same answer for every address) |
| POST | `/api/auth/signin` | User login |
| POST | `/api/auth/signout` | User logout |
| POST | `/api/auth/refresh` | Refresh JWT token |
| POST | `/api/auth/confirm` | Confirm email verification |
| POST | `/api/auth/password-reset/request` | Request password reset |
| POST | `/api/auth/password-reset/confirm` | Confirm password reset |
| GET | `/api/auth/google` | Initiate Google OAuth |
| GET | `/api/auth/google/callback` | Google OAuth callback |
| POST | `/api/auth/oauth/refresh` | Refresh OAuth tokens |

### Users (`/api/users/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/me` | Get current user profile |
| PUT | `/api/users/me` | Update current user profile |
| GET | `/api/users/[id]` | Get user by ID |
| POST | `/api/users/me/pictures` | Upload profile pictures |
| DELETE | `/api/users/me/pictures/[index]` | Delete profile picture |

### Houses (`/api/houses/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/houses` | Get user's houses |
| POST | `/api/houses` | Create new house |
| GET | `/api/houses/[id]` | Get house details |
| PUT | `/api/houses/[id]` | Update house |
| GET | `/api/houses/[id]/members` | Get house members |
| POST | `/api/houses/[id]/members` | Add house member |
| DELETE | `/api/houses/[id]/members/[user_id]` | Remove house member |
| POST | `/api/houses/[id]/leave` | Leave house |
| POST | `/api/houses/[id]/invitation/generate` | Generate invitation |
| POST | `/api/houses/[id]/invitation/accept` | Accept invitation |

### Invitations (`/api/invitation/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/invitation/[token]` | Get invitation details |
| POST | `/api/invitation/[token]/accept` | Accept invitation |

### Expenses (`/api/expenses/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/expenses` | Get house expenses |
| POST | `/api/expenses` | Create new expense |
| GET | `/api/expenses/[id]` | Get expense details |
| DELETE | `/api/expenses/[id]` | Delete expense |
| GET | `/api/expenses/summary` | Get expense summary |

### Bills (`/api/bills/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bills` | Get house bills |
| POST | `/api/bills` | Create new bill |
| GET | `/api/bills/[id]` | Get bill details |
| PUT | `/api/bills/[id]` | Update bill |
| DELETE | `/api/bills/[id]` | Delete bill |

### Bulletin Notes (`/api/bulletin-notes/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bulletin-notes` | Get house bulletin notes |
| POST | `/api/bulletin-notes` | Create new note |
| DELETE | `/api/bulletin-notes/[id]` | Delete note |
| POST | `/api/bulletin-notes/cleanup` | Clean up expired notes |

### Balance (`/api/balance/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/balance/[house_id]` | Get house balance calculations |

### Reports (`/api/reports/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/user` | Get user's reports |
| GET | `/api/reports/owner` | Get reports for owned houses |
| POST | `/api/reports` | Create new report |
| GET | `/api/reports/[id]` | Get report details |
| DELETE | `/api/reports/[id]` | Delete report |
| PATCH | `/api/reports/[id]/read` | Mark report as read |
| PATCH | `/api/reports/[id]/solved` | Mark report as solved |
| POST | `/api/reports/[id]/images` | Upload report images |

## Authentication & Authorization

### JWT Authentication

The API uses JWT tokens for authentication:

- **Access Token**: Short-lived (15 minutes) for API access
- **Refresh Token**: Long-lived for token renewal
- **Storage**: HTTP-only cookies for security

### Authorization Levels

| Level | Description | Functions |
|-------|-------------|-----------|
| **Public** | No authentication required | Registration, password reset |
| **Authenticated** | Valid JWT token | User profile, house operations |
| **House Member** | User is member of house | Expense/bill operations |
| **House Owner** | User owns the house | Member management, reports |
| **Resource Owner** | User created the resource | Edit/delete own content |

### Auth Utilities

```typescript
// Verify authentication
const user = await verifyAuthCompat(event);

// Check house membership
await ensureHouseMember(houseId, user.id);

// Check ownership
await ensureHouseOwner(houseId, user.id);

// Check resource ownership
await ensureExpenseCreator(expenseId, user.id);
```

## Email System

### Email Templates

Located in `server/templates/`:

- `account-deletion.ts` - Account deletion confirmation
- `base.ts` - Base email template
- And more...

### Email Providers

Configured in `server/providers/` with support for multiple email services.

## File Storage

### Storage Providers

Located in `server/providers/storage/` with support for:

- Local file system
- Cloud storage (AWS S3, etc.)

### File Uploads

- Profile pictures (max 6 per user)
- Bill documents/receipts
- Report images

## Error Handling

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation errors) |
| 401 | Unauthorized (invalid/missing auth) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (duplicate, etc.) |
| 500 | Internal Server Error |

### Error Response Format

```json
{
  "statusCode": 400,
  "statusMessage": "Validation failed",
  "data": {
    "field": "email",
    "message": "Email already exists"
  }
}
```

## Development

### Running the Server

```bash
# Development mode
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

### Database Setup

```bash
# Run migrations
psql -d house_m8 -f database/001_initial_schema.sql
psql -d house_m8 -f database/002_seed.sql
# ... additional migrations
```

### Testing

```bash
# Unit tests
npm run test

# API integration tests
npm run test:api

# E2E tests
npm run test:e2e
```

## Security

### Best Practices

- **Input Validation**: All inputs validated using schemas
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Sanitized outputs
- **CSRF Protection**: SameSite cookies
- **Rate Limiting**: Implemented at infrastructure level
- **Data Encryption**: Passwords hashed with bcrypt

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/house_m8

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Email
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## Deployment

### Production Checklist

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] SSL certificates installed
- [ ] File storage configured
- [ ] Email provider set up
- [ ] Monitoring/logging enabled
- [ ] Backups scheduled

### Supported Platforms

- **Vercel**: Recommended for serverless deployment
- **Netlify**: Alternative serverless option
- **Self-hosted**: Docker containers or traditional servers
- **Railway**: Full-stack deployment platform

## API Documentation

### OpenAPI Specification

The API is documented using OpenAPI 3.0 specification in `openapi.yaml`.

### Postman Collection

A Postman collection is available at `postman-collection.json` for testing the API endpoints.
