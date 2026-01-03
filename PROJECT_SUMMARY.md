# Project Summary (Context Save File)

## 🎯 Current Goal
All core PWA features, Google OAuth authentication, and shopping list functionality (including parts & tools with quantities) are now fully implemented and working for both development and production environments.

## 🛠 Tech Stack
- React 18.3.1 / Vite 5.4.2
- TypeScript 5.5.3
- Tailwind CSS 3.4.1
- Lucide React 0.344.0
- Sonner 2.0.7
- Vite Plugin React
- ESLint 9.9.1
- TypeScript ESLint
- Autoprefixer
- PostCSS

##  PWA Features
- Vite Plugin PWA 1.2.0 - Progressive Web App functionality
- Service Worker - Offline caching and background sync
- Web App Manifest - Installable app configuration

##  Backend & APIs
- Supabase 2.57.4 - Backend-as-a-Service (auth, database, storage)
- Google Generative AI 0.24.1 - AI/ML integration (Gemini)
- React Webcam 7.2.0 - Camera functionality

##  Project Structure
- ES Modules - Modern JavaScript modules
- Component-based architecture - React components in /src/components
- Context API - State management with AuthContext
- Service layer - API calls in /src/services
- Environment variables - Configuration management

##  Deployment
- Vercel - Hosting and deployment platform
- GitHub - Version control and CI/CD integration

##  Key Features
- Authentication - Google OAuth via Supabase
- AI-Powered Analysis - Image/text repair assistance
- Progressive Web App - Installable on mobile devices
- Responsive Design - Mobile-first with Tailwind
- Offline Capability - Service worker caching
- Real-time Sync - Supabase real-time features

## ✅ Completed Tasks
- Project initialization with Vite
- .cursor/rules setup (000, 100, 999)
- .cursorignore configured
- Implemented quantity counters for "Tools" in AI Hero Report (Scanner.tsx).
- Fixed Supabase shopping list unique constraint in `shopping_list_items` table to `UNIQUE(user_id, issue_id, name)`.
- Resolved Google OAuth redirect issues for both local development and custom production domain (`fixit-hero.com`).

## ⏳ Active Work / Next Steps
1. ...
2. ...

## 🧠 Architectural Decisions
- Using Modular .mdc rules for token efficiency.
- Forcing <thinking> blocks for deep reasoning.