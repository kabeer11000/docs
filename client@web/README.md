# Kabeer's Docs (KN / Libre Docs)

A modern document collaboration platform built with Next.js 15, React 19, and TypeScript. Kabeer's Docs enables teams to draft, review, and manage documents with real-time collaboration capabilities.

## Overview

Kabeer's Docs is a comprehensive document management system designed for teams of all types. The platform provides real-time collaborative editing, secure document workflows, and comprehensive document organization tools.

## Tech Stack

### Core Framework
- **Next.js 15** - React framework with App Router
- **React 19** - Component library with TypeScript
- **TypeScript** - Type-safe development environment
- **Turbopack** - Next-generation bundler for development

### UI & Styling
- **Tailwind CSS 4.x** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Lucide React** - Icon library
- **Framer Motion** - Animation library

### Editor & Collaboration
- **TipTap** - Rich text editor framework
- **YJS** - Real-time collaboration engine
- **Hocuspocus** - WebSocket collaboration provider

### State Management
- **Nanostores** - Lightweight state management
- **React hooks** - Local component state

### Development Tools
- **Bun** - Package manager and runtime
- **Biome** - Fast linter and formatter

## Project Structure

```
web/
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── api/            # API routes
│   │   ├── auth/           # Authentication pages
│   │   ├── chat/           # Chat pages
│   │   ├── document/       # Document editor pages
│   │   ├── layout.tsx      # Root layout
│   │   ├── page.tsx        # Home page
│   │   └── providers.tsx   # Client providers
│   ├── components/
│   │   ├── auth/           # Authentication components
│   │   ├── editor/         # Document editor components
│   │   ├── home/           # Dashboard and navigation
│   │   ├── settings/       # User preferences
│   │   └── ui/             # Reusable UI components
│   ├── data/               # Mock data and fixtures
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility functions
│   ├── services/           # API and business logic
│   ├── state/              # Global state stores (Nanostores)
│   ├── styles/             # CSS and Tailwind configuration
│   ├── types/              # TypeScript definitions
│   └── middleware.ts       # Next.js middleware
├── public/                 # Static assets
└── package.json
```

## Installation

### Prerequisites
- Node.js 18+ or Bun 1.x
- Git

### Setup
```bash
# Clone the repository
git clone <repository-url>
cd web

# Install dependencies
bun install

# Start development server
bun dev

# Build for production
bun run build
```

The development server will be available at `http://localhost:4321`.

## Key Features

### Document Editor
- Real-time collaborative editing with live cursors
- Rich text formatting with document templates
- Multi-page document structure with pagination
- Comment and suggestion system
- Auto-save functionality

### Document Management
- Comprehensive document dashboard
- Folder-based organization system
- Document status tracking (draft, review, signed)
- Advanced search and filtering
- Template library

### Authentication & Security
- Secure user authentication system
- Role-based access control
- Session management
- Data encryption and GDPR compliance

### E-Signature Workflow
- Secure electronic signatures
- Audit trail and document tracking
- Multi-party signature workflows
- Document versioning

## Development

### Available Scripts
```bash
bun dev                         # Start development server (Turbopack)
bun build                       # Build for production
bun start                       # Start production server
bun preview                     # Preview production build
bun lint                        # Run Biome linter
bun format                      # Format code with Biome
bun test                        # Run tests with Vitest
bun run build:caret             # Build collaboration caret package
bun run build:pagination        # Build pagination package
bun run build:extension-pagination  # Build pagination extension
```

### State Management
The application uses Nanostores for global state management:

```typescript
// Example: Document state
import { map } from 'nanostores'

export const documentState = map({
  currentDocument: null,
  isEditing: false,
  collaborators: [],
  lastSaved: null
})
```

### Component Architecture
Components follow a modular structure with clear separation of concerns:
- **Pages** in `src/app/` using Next.js App Router file conventions
- **UI components** in `src/components/ui/` (shadcn/ui style)
- **Feature components** in dedicated directories (auth, editor, home, settings)
- **Server Components** by default for optimal performance
- **Client Components** marked with `'use client'` directive
- **Shared hooks** in `src/hooks/`
- **Type definitions** in `src/types/`

### Routing & API
Next.js App Router provides file-based routing with powerful features:
- **Dynamic routes** - `[id]` for dynamic parameters
- **API routes** - Server-side endpoints in `src/app/api/`
- **Middleware** - Request/response processing in `src/middleware.ts`
- **Server Actions** - Direct server functions with `'use server'`
- **Layouts** - Shared UI with nested `layout.tsx` files

### Styling Guidelines
- Use Tailwind utility classes for styling
- Follow the established design system
- Maintain responsive design principles
- Use Radix UI primitives for accessibility

## Configuration

### Environment Variables

The application uses environment-specific configuration files for different deployment environments. Environment variables are validated using Zod schema for type safety.

#### Environment Files
- `.env.local` - Development environment (auto-loaded)
- `.env.staging` - Staging environment
- `.env.production` - Production environment
- `.env.example` - Template file with all required variables

#### Required Environment Variables

**API Configuration**
```env
# Backend API endpoints
PUBLIC_BACKEND_BASE_URL=http://localhost:5000
PUBLIC_BACKEND_WEBSOCKET_URL=ws://localhost:1235

# AI Service endpoints
PUBLIC_AI_BASE_URL=http://localhost:8000
PUBLIC_AI_WEBSOCKET_URL=ws://localhost:8000/ws/chat/test

# Frontend application URL
PUBLIC_API_URL=http://localhost:4321
```

**Feature Flags**
```env
# Enable/disable application features
PUBLIC_ENABLE_AI_CHAT=true
PUBLIC_ENABLE_COLLABORATION=true
PUBLIC_ENABLE_FILE_UPLOAD=true
PUBLIC_DEBUG_MODE=false
PUBLIC_ENABLE_REACT_SCAN=false
```

**Environment Settings**
```env
# Environment identification
NODE_ENV=development
PUBLIC_ENVIRONMENT=development

# CORS configuration
PUBLIC_ALLOWED_ORIGINS=http://localhost:4321,http://localhost:3000
```

**Server-side Secrets (Production)**
```env
# JWT and session management (server-side only)
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters
SESSION_SECRET=your-super-secure-session-secret-minimum-32-characters

# Database (if needed)
MONGODB_URI=mongodb://your-mongodb-connection-string
MONGODB_DB_NAME=lexa-database

# OAuth secrets
AUTH_GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
```

**Optional External Services**
```env
# Content delivery and monitoring
PUBLIC_CDN_URL=https://cdn.yourdomain.com
PUBLIC_SENTRY_DSN=https://your-sentry-dsn-for-error-tracking
```

#### Environment Setup

1. **Development Setup**
```bash
# Copy the example environment file
cp .env.example .env.local

# Update the values for your local development setup
# The .env.local file is already configured for localhost development
```

2. **Production Setup**
```bash
# For production deployment, set environment variables via your deployment platform:
# - Vercel: Project Settings → Environment Variables
# - Netlify: Site Settings → Environment Variables  
# - GCP: App Engine environment variables
# - Docker: Environment variables or env files
```

#### Environment Validation

The application automatically validates all environment variables on startup using a Zod schema. Missing or invalid environment variables will cause the application to fail with descriptive error messages.

#### Type-Safe Environment Access

Environment variables are accessed through the validated `env` object:

```typescript
import { env } from '@/lib/env'

// Type-safe access to environment variables
const backendUrl = env.PUBLIC_BACKEND_BASE_URL
const isDebugMode = env.PUBLIC_DEBUG_MODE
```

#### Security Best Practices

- **Public vs Private Variables**: Only variables prefixed with `PUBLIC_` are accessible on the client-side
- **Server-side Secrets**: Variables like `JWT_SECRET` are only accessible server-side
- **Environment Separation**: Use different values for development, staging, and production
- **Secret Rotation**: Regularly rotate JWT secrets and API keys
- **CORS Configuration**: Restrict `PUBLIC_ALLOWED_ORIGINS` to your actual domains

### Build Configuration
The project uses Next.js 15 with the App Router and Turbopack for development. Configuration is in `next.config.ts`:

```typescript
// next.config.ts highlights:
- React Strict Mode: disabled for compatibility
- Server Actions: 10MB body size limit
- Image optimization: Remote patterns enabled
- Experimental features: Server Actions
```

## Deployment

### Production Build
```bash
bun run build
```

### Deployment Targets
- **Vercel** (recommended - optimized for Next.js)
- **Netlify**
- **Self-hosted** (Node.js server with `bun start`)
- **Docker** containers
- **Cloud platforms** (AWS, GCP, Azure) supporting Node.js

## API Integration

The frontend is designed to work with a separate backend service for:
- User authentication
- Document persistence
- Collaboration sync
- E-signature processing

## Contributing

### Development Guidelines
- Follow TypeScript best practices
- Write comprehensive tests
- Maintain responsive design
- Follow semantic commit conventions
- Update documentation for new features

### Pull Request Process
1. Fork the repository
2. Create a feature branch
3. Make changes with appropriate tests
4. Update documentation if needed
5. Submit pull request with clear description

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Support

For technical support and questions:
- Create an issue in the repository
- Check existing documentation
- Contact the development team