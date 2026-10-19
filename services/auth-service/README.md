# Authentication Service

A comprehensive Go-based authentication microservice supporting multiple authentication methods including password-based auth, Google OAuth, and WebAuthn/Passkey authentication.

## Features

- **Password Authentication**: Traditional email/password registration and login
- **Google OAuth**: Federated authentication with Google accounts
- **WebAuthn/Passkey**: Passwordless authentication using FIDO2/WebAuthn
- **JWT Tokens**: Secure token-based authentication with access, refresh, and ID tokens
- **MongoDB Storage**: Persistent user data and session management
- **Rate Limiting**: Protection against brute force attacks
- **CORS Support**: Configurable cross-origin resource sharing
- **Security Middleware**: Authentication, validation, and logging

## Project Structure

```
authentication-service/
├── database/
│   └── connection.go          # MongoDB connection management
├── handlers/
│   ├── auth_handlers.go       # Password auth endpoints
│   ├── google_oauth_handlers.go # Google OAuth endpoints
│   └── webauthn_handlers.go   # WebAuthn/Passkey endpoints
├── middleware/
│   ├── auth_middleware.go     # JWT authentication middleware
│   ├── cors_middleware.go     # CORS configuration
│   └── rate_limit_middleware.go # Rate limiting
├── models/
│   └── user.go               # User and auth data models
├── repositories/
│   ├── user_repository.go    # User data access layer
│   ├── state_repository.go   # OAuth state management
│   └── webauthn_session_repository.go # WebAuthn sessions
├── routes/
│   └── routes.go             # API route configuration
├── services/
│   ├── auth_service.go       # Password auth business logic
│   ├── google_oauth_service.go # Google OAuth logic
│   └── webauthn_service.go   # WebAuthn logic
├── utils/
│   ├── jwt.go               # JWT token management
│   ├── crypto.go            # Cryptographic utilities
│   ├── validation.go        # Input validation
│   └── logger.go            # Logging utilities
├── main.go                  # Application entry point
├── go.mod                   # Go module definition
└── .env.example            # Environment variables template
```

## Setup

### Prerequisites

- Go 1.21 or later
- MongoDB 4.4 or later
- JWT RSA key pair (private and public keys)

### Environment Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Configure your environment variables:
   ```env
   # Database
   MONGODB_URI=mongodb://localhost:27017/lexaauth

   # JWT Configuration
   JWT_PRIVATE_KEY_PATH=./keys/jwt_private.pem
   JWT_PUBLIC_KEY_PATH=./keys/jwt_public.pem
   JWT_ISSUER=lexa-auth-service

   # Google OAuth
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_REDIRECT_URL=http://localhost:8080/api/v1/auth/google/callback

   # WebAuthn
   WEBAUTHN_DISPLAY_NAME=Lexa
   WEBAUTHN_RPID=localhost
   WEBAUTHN_ORIGIN=http://localhost:8080

   # Server
   SERVER_PORT=8080
   SERVER_HOST=localhost
   ```

### JWT Key Generation

Generate RSA key pair for JWT signing:

```bash
# Create keys directory
mkdir -p keys

# Generate private key
openssl genrsa -out keys/jwt_private.pem 2048

# Generate public key
openssl rsa -in keys/jwt_private.pem -pubout -out keys/jwt_public.pem
```

### Installation

1. Install dependencies:
   ```bash
   go mod download
   ```

2. Run the service:
   ```bash
   go run main.go
   ```

## API Endpoints

### Authentication Endpoints

#### Password Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/revoke` - Revoke refresh token
- `POST /api/v1/auth/logout` - Logout user

#### Google OAuth
- `GET /api/v1/auth/google/init` - Initiate Google OAuth flow
- `GET /api/v1/auth/google/callback` - OAuth callback endpoint
- `DELETE /api/v1/auth/google/disconnect` - Disconnect Google account (requires auth)

#### WebAuthn/Passkey
- `POST /api/v1/auth/passkey/login/begin` - Begin passkey login
- `POST /api/v1/auth/passkey/login/finish/:challengeId` - Complete passkey login
- `POST /api/v1/passkey/register/begin` - Begin passkey registration (requires auth)
- `POST /api/v1/passkey/register/finish/:challengeId` - Complete passkey registration (requires auth)
- `GET /api/v1/passkey/credentials` - List user's passkeys (requires auth)
- `DELETE /api/v1/passkey/credentials/:credentialId` - Delete passkey (requires auth)

### Protected Endpoints

- `GET /api/v1/profile` - Get user profile (requires auth)

### Health Check

- `GET /health` - Service health status

## Authentication Flow Examples

### Password Registration
```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "name": "John Doe",
    "password": "SecurePass123!"
  }'
```

### Password Login
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

### Google OAuth Flow
1. Get auth URL: `GET /api/v1/auth/google/init`
2. Redirect user to returned `auth_url`
3. Google redirects to callback with auth code
4. Service exchanges code for tokens and returns auth response

### WebAuthn Registration
1. Begin registration: `POST /api/v1/passkey/register/begin` (with Bearer token)
2. Use returned challenge with WebAuthn API on frontend
3. Complete registration: `POST /api/v1/passkey/register/finish/:challengeId`

### WebAuthn Login
1. Begin login: `POST /api/v1/auth/passkey/login/begin` with email
2. Use returned challenge with WebAuthn API on frontend
3. Complete login: `POST /api/v1/auth/passkey/login/finish/:challengeId`

## Response Format

All endpoints return JSON responses:

### Success Response (Authentication)
```json
{
  "user": {
    "id": "user_object_id",
    "email": "user@example.com",
    "name": "John Doe",
    "auth_methods": ["password", "google", "passkey"],
    "email_verified": true,
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z"
  },
  "access_token": "jwt_access_token",
  "refresh_token": "jwt_refresh_token", 
  "id_token": "jwt_id_token",
  "expires_in": 900,
  "token_type": "Bearer"
}
```

### Error Response
```json
{
  "error": "error_code",
  "message": "Human readable error message"
}
```

## Token Types

- **Access Token**: Short-lived (15 minutes) token for API access
- **Refresh Token**: Long-lived (30 days) token for obtaining new access tokens
- **ID Token**: Contains user identity information (1 hour) for client applications

## Security Features

- Bcrypt password hashing with configurable cost
- JWT tokens with RSA256 signing
- CSRF protection via state parameters (OAuth)
- Rate limiting (60 requests/minute by default)
- Input validation and sanitization
- Secure session management
- CORS configuration
- Comprehensive logging and monitoring

## Environment Variables

See `.env.example` for complete list of configuration options.

## License

This project is licensed under the MIT License.