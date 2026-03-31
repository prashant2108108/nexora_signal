# Nexora Signal - Scalable Architecture

This architecture is designed to handle **100,000+ users** by focusing on **Feature Isolation**, **Backend Separation**, and **Centralized Shared Core**.

## 1. Feature-First Architecture (The Scalability Engine)

The project is structured under the `src/features/` directory. Each feature is a self-contained module.

### Structure of a Feature: `src/features/[feature_name]/`
- **`api/`**: API handlers, data fetching, and external service communication (Supabase calls specifically for this feature).
- **`components/`**: UI components specific only to this feature.
- **`hooks/`**: React hooks encapsulating business logic or state (React Query integration).
- **`services/`**: Complex business logic functions that aren't hooks.
- **`types.ts`**: TypeScript interfaces related to this domain only.
- **`index.ts`**: The "Public API" of the feature. Other parts of the app *only* import from `index.ts`.

> [!TIP]
> **Zero Merge Conflicts**: Since Developer A works in `features/trend/` and Developer B works in `features/content/`, they will rarely touch the same files, preventing conflicts in a large team.

---

## 2. Nexora Signal Project Structure

```text
src/
├── app/                        # Next.js routes (App Router)
│   ├── (auth)/                 # Grouped Auth routes
│   │   ├── login/
│   │   └── signup/
│   ├── (dashboard)/            # Grouped Dashboard routes (authenticated)
│   │   ├── trends/
│   │   ├── content/
│   │   └── layout.tsx          # Dashboard-specific UI (Sidebar, Navbar)
│   └── page.tsx                # Public Landing Page
│
├── features/                   # 🔥 MAIN SCALE LAYER
│   ├── trend/                  # Feature: Trend Finder
│   ├── content/                # Feature: Content Generator
│   ├── auth/                   # Feature: Authentication UI & Logic
│   └── billing/                # Feature: Stripe & Subscription
│
├── shared/                     # Global Shared Directory
│   ├── ui/                     # Generic UI (Button, Modal, Input)
│   ├── lib/                    # Shared utilities (supabase-client, axios)
│   └── hooks/                  # Global hooks (useTheme, useUser)
│
├── server/                     # Backend-Only Logic
│   ├── db/                     # Supabase database queries and schemas
│   ├── ai/                     # OpenAI / LLM integration logic
│   └── jobs/                   # Background job processing
│
├── config/                     # Environment and App configs
└── middleware.ts               # Request protection and routing
```

---

## 3. High Performance & Scalability (100k+ Users)

### A. Database Strategy (Supabase)
1. **Edge Functions**: Offload heavy logic or secure API keys to Supabase Edge Functions.
2. **Row-Level Security (RLS)**: Crucial for security at scale. Every query is filtered at the DB level based on the `auth.uid()`.
3. **Optimistic Updates**: Use `React Query` (TanStack Query) in the `features/[feature]/hooks/` to provide a lag-free experience.

### B. Backend Separation (`server/` Layer)
As the app grows, you can easily migrate the code in `src/server/` into a dedicated **FastAPI** or **Go** microservice. The structure already decouples DB logic from React components.

### C. UI Consistency (`shared/ui/`)
All developers use the same `shared/ui` components (built with Tailwind + Framer Motion). This ensures the app looks and feels premium without ad-hoc styling.

---

## 4. Next Steps & Implementation Checklist

- [x] Initial Directory Structure Created
- [x] Root & Dashboard Layouts Implemented
- [x] Middleware Configured
- [ ] **Step 1:** Install & Initialize `@supabase/auth-helpers-nextjs` and `@supabase/supabase-js`.
- [ ] **Step 2:** Setup Environment Variables (`.env.local`) for Supabase URL/Key.
- [ ] **Step 3:** Implement Auth flow in `features/auth`.
- [ ] **Step 4:** Integrate Open AI in `server/ai/content-gen.ts`.
