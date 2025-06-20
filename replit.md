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

## Credenciais de Administrador

**Acesso ao Painel Administrativo:**
- URL: `/admin/login`
- Email: `adm@meuperfil360.com.br`
- Senha: `admin123456`

## Changelog
- June 20, 2025: **MOBILE TEST INTERFACE OPTIMIZED** - Enhanced DISC test experience for mobile devices
  - Added persistent progress bar in header showing current question number and percentage
  - Implemented responsive question layout with compact mobile and full desktop versions
  - Created fixed bottom navigation with accessible buttons for mobile users
  - Optimized DiscQuestion component with stacked layout for mobile (buttons below text)
  - Enhanced visual feedback with larger touch targets and improved color contrast
  - Mobile users now always see progress context during test completion
- June 20, 2025: **USER FLOW CORRECTION** - Fixed result viewing for new users without blocking privacy overlay
  - New users can immediately view DISC results after test completion
  - Registration modal auto-opens after 3 seconds with real user data pre-filled
  - Privacy protection only applies when searching for existing tests via find-results
  - Guest data properly populated in registration modal (name, email, WhatsApp)
- June 20, 2025: **PDF RESPONSIVENESS OPTIMIZED** - Resolved content cutting issues in premium PDF reports
  - Fixed "Plano de Ação Personalizado de 4 Semanas" table cutting with optimized cell sizing
  - Action table headers reduced to 10px font with 80px max-width and proper word-wrap
  - Table cells optimized with 10px font, 200px max-width, and overflow-wrap protection
  - Week badges resized to 9px font with compact 4px padding for better table fit
  - Enhanced table responsiveness with smaller padding and max-width constraints
  - Implemented page-break-inside: avoid for sections to prevent awkward breaks
- June 20, 2025: **DASHBOARD ROUTING FIXED** - Corrected dashboard route configuration to accept user ID parameter
  - Updated AppFixed.tsx route from `/dashboard` to `/dashboard/:userId` to match component expectations
  - Dashboard now loads correctly after user registration with proper user data
  - API endpoints responding successfully: dashboard data, test limits, and user information
- June 20, 2025: **ERROR 404 RESOLVED** - Fixed frontend routing configuration causing test result access failures
  - Corrected missing route parameter `:id` in AppFixed.tsx for `/results/:id` path
  - Enhanced React Query configuration with proper retry mechanism and stale time
  - Improved error handling in results page with specific 404 detection and user guidance
  - Verified test data integrity in database (test ID 8 for atorquato51@gmail.com exists and accessible)
  - All API endpoints working correctly, frontend now matches backend routing structure
- June 20, 2025: **EMAIL TEMPLATES SYSTEM FIXED** - Corrected template names, validation errors, and database constraints
  - Updated template identifiers: boas_vindas_cadastro, teste_concluido, upgrade_premium, lembrete_reteste
  - Fixed middleware validation blocking email test functionality
  - Resolved database constraint issues with ON CONFLICT specifications
  - Cleaned up excessive logging while maintaining essential error tracking
- June 20, 2025: **ADMIN PANEL LAYOUT CORRECTED** - Fixed navbar overlap issues affecting all administrative pages
  - Dashboard, email config, pricing, and templates pages now display properly
  - Added responsive margin (lg:ml-64) to prevent content being hidden behind sidebar
- June 20, 2025: **SECURITY HARDENING COMPLETE** - Comprehensive security audit implemented with critical vulnerability fixes
  - Reactivated all security middlewares (rate limiting, threat detection, input validation)
  - Removed all console.log statements exposing sensitive user data, payment info, and authentication tokens
  - Strengthened CSP with HSTS, XSS protection, and stricter content policies
  - Enhanced rate limiting: 50 requests/15min general, 3 attempts/10min for auth, 2 attempts/30min for admin
  - Implemented sanitized error responses to prevent information disclosure
  - Secured localStorage with improved encryption using random IVs
  - Threat detection system now masks sensitive data in security logs
- June 20, 2025: **SECURITY PRIVACY SYSTEM** - Results protected with overlay until user registration, preventing unauthorized access to sensitive data
- June 20, 2025: **WELCOME MESSAGE FIXED** - Corrected "undefined" display in login/dashboard welcome messages with proper user name fallbacks
- June 20, 2025: **NAVIGATION ENHANCEMENT** - Login page header displays navigation bar with "Início" button for easy return to homepage
- June 20, 2025: **AUTO-REGISTRATION SYSTEM** - Users without accounts get registration modal with pre-filled test data (name, email, WhatsApp)
- June 20, 2025: **AUTO-REDIRECT AFTER REGISTRATION** - Users automatically redirected to personal dashboard after account creation
- June 20, 2025: **USER REGISTRATION FIXED** - Resolved clerk_id constraint error, registration system fully functional
- June 19, 2025: **PRODUCTION READY** - System prepared for www.meuperfil360.com.br with all production configurations
- June 19, 2025: **TYPESCRIPT ERRORS RESOLVED** - Fixed all compilation issues, removed legacy checkout components
- June 19, 2025: **DOMAIN CONFIGURED** - Updated all URLs and CORS settings for production domain
- June 19, 2025: **SECURITY ENHANCED** - Production-grade security middleware and validation implemented
- June 19, 2025: **CHECKOUT MODERNIZED** - Replaced old checkout with modern, responsive interface that fixes API errors and improves payment flow
- June 19, 2025: **PAYMENT TEST PAGE CREATED** - Added /payment-test with both simulated and real Stripe options to bypass browser issues
- June 19, 2025: **STRIPE CHECKOUT FULLY FUNCTIONAL** - Fixed URL validation issues, checkout sessions now working perfectly
- June 19, 2025: **STRIPE CHECKOUT PRODUCTION-READY** - Implemented Stripe Checkout Sessions with PIX and card options
- June 19, 2025: Created complete payment interface with method selection (PIX/Card)
- June 19, 2025: Configured webhook endpoint for automatic premium upgrade confirmation
- June 19, 2025: Successfully resolved Stripe PaymentElement rendering issues with timeout mechanism
- June 19, 2025: Implemented automatic user data population in registration modal
- June 19, 2025: Fixed Stripe integration with complete reconstruction of payment flow
- June 19, 2025: Resolved payment intent creation errors (corrected parameter mapping)
- June 19, 2025: Improved premium upgrade messaging with detailed benefits
- June 19, 2025: Enhanced CSP configuration for Stripe domains (q.stripe.com)
- June 19, 2025: Temporarily disabled Clerk due to initialization conflicts
- June 19, 2025: Successfully migrated from Replit Agent to standard Replit environment
- June 19, 2025: Integrated Clerk authentication system replacing custom auth
- June 19, 2025: Updated database schema to work with Clerk user management
- June 19, 2025: Modified frontend components to use Clerk authentication
- June 18, 2025: Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.