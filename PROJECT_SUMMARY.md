# Fixit Hero - AI-Powered Home Repair Assistant

## 📋 Application Purpose
Fixit Hero is an AI-powered Progressive Web App (PWA) designed to help homeowners identify, diagnose, and repair home maintenance issues. Users can take photos or describe problems, receive AI-powered diagnoses, get step-by-step repair instructions, and manage parts/tools shopping lists. The app combines conversational AI with practical home repair guidance, making professional-level repair assistance accessible to DIY homeowners.

## 🛠 Tech Stack
- **Frontend Framework**: React 18.3.1 with TypeScript 5.5.3
- **Build Tool**: Vite 5.4.2 (ESM-first, lightning-fast HMR)
- **Styling**: Tailwind CSS 3.4.1 (utility-first CSS framework)
- **Icons**: Lucide React 0.344.0 (consistent iconography)
- **Notifications**: Sonner 2.0.7 (toast notifications)
- **Development Tools**:
  - ESLint 9.9.1 with TypeScript ESLint
  - Autoprefixer & PostCSS for CSS processing
  - Vite Plugin React for optimized React builds

## 📱 PWA Features
- **Vite Plugin PWA 1.2.0**: Complete PWA functionality with auto-updates
- **Service Worker**: Background caching and offline capability
- **Web App Manifest**: Installable app with custom icons (192x192, 512x512 SVG)
- **Offline Support**: Core functionality works without internet connection
- **Mobile-First**: Responsive design optimized for mobile devices
- **App-Like Experience**: Standalone mode, portrait orientation, custom theme colors

## 🔧 Backend & APIs
- **Supabase 2.57.4**: Backend-as-a-Service providing:
  - User authentication (Google OAuth integration)
  - PostgreSQL database with Row Level Security (RLS)
  - Real-time subscriptions and data synchronization
  - Automatic profile creation on user signup
- **Google Generative AI 0.24.1**: Gemini AI integration for:
  - Conversational repair diagnosis
  - Image analysis for visual problem identification
  - Streaming responses with typing effects
  - Multimodal input (text + images)
- **React Webcam 7.2.0**: Camera integration for photo capture during repairs
- **Affiliate Program Integration**: Links to Amazon, Home Depot, Lowe's, and Walmart with configurable affiliate tags

## 🗄️ Database Structure
**Supabase PostgreSQL Schema with RLS:**
- **`profiles`**: User profiles (email, name, location data, home details)
- **`repairs`**: Saved repair diagnoses (title, summary, parts, tools, steps)
- **`maintenance_tasks`**: User-defined maintenance schedules with smart scheduling
- **`maintenance_history`**: Completed maintenance task records with parts/tools used
- **`maintenance_parts`**: User parts and tools inventory with affiliate links
- **`shopping_list_items`**: Parts/tools shopping lists linked to repairs via `issue_id`

**Key Relationships:**
- `repairs.id` → `shopping_list_items.issue_id` (foreign key)
- All tables use `user_id` for user isolation via RLS
- Unique constraints prevent duplicate shopping list items per user/issue
- Maintenance tasks calculate next due dates based on completion history
- Parts inventory tracks purchase history and affiliate shopping links

## 🏗️ Project Structure
- **ES Modules**: Modern JavaScript module system
- **Component Architecture**: `/src/components` with focused, reusable React components
- **State Management**: React Context API (`AuthContext` for authentication)
- **Service Layer**: `/src/services` for external API integrations:
  - `supabaseClient.ts`: Supabase configuration and client
  - `geminiService.ts`: AI conversation and diagnosis logic
  - `repairService.ts`: Repair data management
  - `shoppingListService.ts`: Shopping list operations
  - `authService.ts`: Authentication utilities
  - `affiliateService.ts`: E-commerce affiliate link generation
- **Environment Configuration**: `import.meta.env` for secure API key management

## 🚀 Deployment & Version Control
- **Hosting**: Vercel for global CDN, automatic deployments, and preview environments
- **Version Control**: GitHub for source code management and CI/CD integration
- **Domain**: Custom domain (`fixit-hero.com`) with OAuth redirect configuration

## ✨ Key Features
- **AI-Powered Diagnosis**: Conversational Gemini AI for iterative repair guidance
- **Multimodal Input**: Text descriptions + photo analysis for comprehensive diagnosis
- **Camera Integration**: Built-in photo capture for on-site problem documentation
- **Structured Repair Data**: AI extracts parts, tools, and step-by-step instructions
- **Hero Reports**: Saved repair histories with complete diagnosis details
- **Smart Shopping Lists**: Automatic parts/tools lists linked to specific repairs
- **Advanced Maintenance System**:
  - Intelligent scheduling with next due date calculations
  - Visual status indicators (⚠️ overdue, 🔔 due soon, 📅 upcoming)
  - Comprehensive parts and tools inventory management
  - Affiliate shopping links for re-purchase (Amazon, Home Depot, Lowe's, Walmart)
  - Detailed maintenance history with cost tracking
- **Affiliate Shopping**: Direct links to purchase parts from major retailers
- **Real-Time Sync**: Cross-device data synchronization via Supabase
- **Offline Capability**: Core functionality works without internet connection

## 📝 Development Rules & Guidelines
**Modular Cursor Rules System (.cursor/rules/):**
- **`000-reasoning.mdc`**: Mandatory reasoning protocol requiring `<thinking>` blocks before code changes
- **`100-react-vite.mdc`**: React/Vite best practices for modern development patterns
- **`999-project-summary.mdc`**: Project handover protocol for AI model continuity
- **`style-guide.mdc`**: Code style preferences (camelCase variable naming)

**Development Protocol:**
1. **Context Analysis**: Use `@Codebase` queries to understand existing architecture
2. **Thinking Phase**: Required `<thinking>` blocks for architectural decisions
3. **Impact Assessment**: Analyze side effects (React re-renders, Vite HMR issues)
4. **Execution**: Provide code changes with clear step-by-step planning
5. **Verification**: Test changes and verify integration points

## ✅ Completed Tasks & Features
- **Core Infrastructure**: Vite project setup with TypeScript and Tailwind
- **Authentication System**: Google OAuth integration with Supabase
- **AI Integration**: Streaming Gemini conversations with image analysis
- **Database Architecture**: Complete schema with RLS policies and relationships
- **PWA Implementation**: Installable app with offline capabilities
- **Component Development**:
  - Conversational chat interface with typing effects
  - Camera integration for photo capture
  - Diagnosis parsing and structured data extraction
  - Shopping list management with quantity tracking
  - **Enhanced Maintenance System**:
    - Smart scheduling with next due date calculations
    - Visual status indicators (upcoming, due, overdue)
    - Parts and tools tracking with affiliate links
    - Maintenance history with detailed completion records
    - Parts Manager for inventory tracking and re-purchase
  - Hero Reports for saved diagnoses
- **User Experience**: Mobile-first responsive design, toast notifications, loading states
- **Performance Optimizations**: Image compression, rate limiting, debouncing
- **Affiliate Integration**: Multi-retailer shopping links with configurable tags

## 🔮 Potential Improvements & Missing Features
- **Token Management**: Lite version with usage limits to prevent Gemini API costs
- **Advanced AI Features**: Voice input, video analysis, repair cost estimation
- **Social Features**: Community repair tips, expert verification system
- **IoT Integration**: Smart home device diagnostics and automation
- **Offline Enhancement**: Advanced caching strategies for complete offline functionality
- **Analytics**: User behavior tracking for feature improvement
- **Monetization**: Premium features, affiliate revenue optimization
- **Localization**: Multi-language support for global user base
- **Performance**: Code splitting, lazy loading, bundle size optimization
- **Security**: Enhanced authentication, data encryption, privacy controls