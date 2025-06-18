# MeuPerfil360 - DISC Assessment Platform

## Overview

MeuPerfil360 is a comprehensive web application for conducting DISC behavioral assessments. The platform allows users to take psychological tests, receive detailed reports, and access premium analysis features. Built with modern web technologies, it provides a seamless experience for both guests and registered users.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state
- **Forms**: React Hook Form with Zod validation
- **UI Components**: Radix UI primitives with custom styling

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Custom session-based auth with bcrypt
- **Payment Processing**: Stripe integration
- **Email Service**: Nodemailer with SMTP configuration

### Security Architecture
- **Input Validation**: Client and server-side sanitization
- **Rate Limiting**: Express rate limiting middleware
- **Security Headers**: Helmet.js for HTTP security
- **Data Encryption**: CryptoJS for sensitive data
- **CORS**: Configured for production domains

## Key Components

### Test Engine
- **DISC Calculator**: Behavioral profile analysis algorithm
- **Question System**: Multi-choice questionnaire with validation
- **Progress Tracking**: Real-time test completion monitoring
- **Result Generation**: Automated profile type determination

### Payment System
- **Stripe Integration**: Credit card and PIX payment methods
- **Premium Features**: Detailed reports and analysis
- **Subscription Management**: User account upgrades
- **Payment Verification**: Webhook handling for transaction confirmation

### User Management
- **Guest Testing**: Anonymous test-taking capability
- **User Registration**: Account creation with validation
- **Authentication**: Secure login/logout functionality
- **Dashboard**: Personal test history and results

### Admin Panel
- **Dashboard**: System metrics and user analytics
- **Email Configuration**: SMTP settings management
- **Template Management**: Customizable email templates
- **Pricing Control**: Dynamic pricing and promotion settings

### Content Generation
- **PDF Reports**: Premium report generation (server-side)
- **Email Templates**: Automated notification system
- **Profile Analysis**: Detailed behavioral insights
- **Career Recommendations**: Personalized guidance

## Data Flow

1. **Test Taking Flow**:
   - User provides contact information
   - Completes DISC questionnaire
   - System calculates behavioral profile
   - Basic results displayed immediately

2. **Premium Upgrade Flow**:
   - User opts for detailed analysis
   - Payment processed via Stripe
   - Premium report generated
   - Email delivery with PDF attachment

3. **User Registration Flow**:
   - Guest data converted to user account
   - Historical tests associated with user
   - Dashboard access granted
   - Subscription management enabled

4. **Admin Management Flow**:
   - Secure admin authentication
   - System configuration management
   - User and test analytics
   - Email template customization

## External Dependencies

### Payment Services
- **Stripe**: Payment processing and subscription management
- **Webhook Endpoints**: Real-time payment status updates

### Communication Services
- **SMTP Provider**: Email delivery system
- **Template Engine**: Dynamic email content generation

### Database Services
- **Neon Database**: PostgreSQL hosting (production)
- **Local SQLite**: Development database fallback

### Security Services
- **Helmet.js**: HTTP security headers
- **bcrypt**: Password hashing
- **express-rate-limit**: Request throttling

## Deployment Strategy

### Development Environment
- **Replit Integration**: Live development and testing
- **Vite Dev Server**: Hot module replacement
- **Local Database**: SQLite for quick setup

### Production Environment
- **Node.js Server**: Express application serving React build
- **Static File Serving**: Nginx for frontend assets
- **Database**: PostgreSQL with SSL connections
- **Environment Variables**: Secure configuration management

### Build Process
- **Frontend Build**: Vite compilation to static assets
- **Backend Build**: esbuild bundling for Node.js
- **Database Migrations**: Drizzle kit schema updates
- **Asset Optimization**: Minification and compression

### Security Considerations
- **HTTPS Enforcement**: SSL/TLS encryption
- **CORS Configuration**: Restricted domain access
- **Input Sanitization**: XSS prevention
- **Rate Limiting**: DDoS protection
- **Data Encryption**: Sensitive information protection

## Changelog
- June 18, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.