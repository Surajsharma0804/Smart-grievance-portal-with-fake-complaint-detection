# Syllabus Mapping

Traceability matrix of academic syllabus topics to source files.

Status values: Done, N/A (with reason).

## INT252: Web App Development with ReactJS (apps/admin, plus client parts of apps/web)

| Unit | Topic | Where it is used in this project | Task | File | Status |
|---|---|---|---|---|---|
| I | Arrow functions, let/const, array methods, destructuring, spread/rest, ES modules | Everywhere; deliberately visible in utilities such as grouping complaints by status, building query strings | 8B.1 | `apps/admin/src/app/App.tsx`, `packages/shared/src/index.ts` | Done |
| I | Immutability, shallow vs deep copy, referential equality | State updates, stable callbacks and list mapping | 8B.5, 8B.8 | `apps/admin/src/app/App.tsx` | Done |
| I | SPA vs MPA | Staff console is an SPA; citizen portal is server-rendered. Detailed in README | 8B.1 | `apps/admin/src/app/App.tsx`, `README.md` | Done |
| I | Vite setup, feature-based folders, JSX, Virtual DOM | `apps/admin` tooling and build structure | 8B.1 | `apps/admin/vite.config.ts`, `apps/admin/src/main.tsx` | Done |
| II | Composition, props-driven reuse, conditional rendering, lifting state up | `StatusBadge`, `DashboardLayout`, modal overlays, queue table filtering | 8B.8 | `apps/admin/src/app/App.tsx` | Done |
| II | Tailwind, responsive breakpoints, utility-first patterns | All staff screens; responsive layout and action buttons | 8B.1, 8B.10 | `apps/admin/src/index.css`, `apps/admin/src/app/App.tsx` | Done |
| II | Accessibility, semantic HTML | Landmarks, labelled controls, high contrast | 8B.11 | `apps/admin/src/app/App.tsx` | Done |
| III | Events, `useState`, batching, derived state | Filter states, modal forms, status transitions | 8B.4, 8B.8 | `apps/admin/src/app/App.tsx` | Done |
| III | `useEffect`, dependency arrays, cleanup | Data fetching, session refresh, cleanup | 8B.9 | `apps/admin/src/app/App.tsx` | Done |
| III | `useContext` | AuthContext for session management and role guards | 8B.3 | `apps/admin/src/app/App.tsx` | Done |
| III | Custom hooks, rules of hooks | `useAuth`, custom async actions | 8B.9 | `apps/admin/src/app/App.tsx` | Done |
| IV | Controlled and uncontrolled components | Controlled admin forms (departments, users); controlled login form | 8B.7 | `apps/admin/src/app/App.tsx` | Done |
| IV | Form submission workflow, reusable form components, accessibility | Login form, department creation form with validation | 8B.7 | `apps/admin/src/app/App.tsx` | Done |
| IV | Zod, schema-based validation, integration with form logic | Shared schemas from `packages/shared` for validation | 8B.7 | `packages/shared/src/schemas.ts` | Done |
| V | REST, Fetch, loading/error/empty states | Fetch API with credentials, loading spinners, empty states | 8B.3, 8B.4 | `apps/admin/src/app/App.tsx` | Done |
| V | Routing: dynamic, nested, layout, query params, protected, code splitting | Staff route tree with `RequireAuth` guard | 8B.2 | `apps/admin/src/app/App.tsx` | Done |
| VI | Context for global state | AuthContext for global user authentication state | 8B.3 | `apps/admin/src/app/App.tsx` | Done |
| VI | Review workspace | Evidence view mode, decision actions (Approve, Reject, Merge, Reroute) | 8B.5 | `apps/admin/src/app/App.tsx` | Done |
| VI | DevTools, build optimisation, env variables, deployment | Vite production build copied to `apps/web/public/staff` for Vercel deployment | 8B.8, 8B.12 | `apps/admin/vite.config.ts`, `apps/web/public/staff/index.html` | Done |

## INT257: Modern Web Application Development (apps/web)

| Unit | Topic | Where it is used in this project | Task | File | Status |
|---|---|---|---|---|---|
| I | Next.js fundamentals, project structure, App Router, dev workflow | `apps/web` App Router structure | 8A.1 | `apps/web/src/app/layout.tsx` | Done |
| I | File-based, dynamic, nested routes, layouts, navigation, error and loading UI | `/(citizen)/track/[id]`, route groups, `loading.tsx`, `error.tsx`, `not-found.tsx` | 8A.1, 8A.5 | `apps/web/src/app/(citizen)/track/[id]/page.tsx`, `apps/web/src/app/error.tsx` | Done |
| II | SSG | Landing `/` and `/how-it-works` statically generated | 8A.3 | `apps/web/src/app/(public)/page.tsx` | Done |
| II | ISR | `/stats` (60s revalidate), `/departments` (300s revalidate) | 8A.3 | `apps/web/src/app/(public)/stats/page.tsx`, `apps/web/src/app/(public)/departments/page.tsx` | Done |
| II | SSR | Real-time complaint tracking page with metadata | 8A.5 | `apps/web/src/app/(citizen)/track/[id]/page.tsx` | Done |
| II | Client-side rendering and strategy selection | Report wizard with GPS coordinates and client form state | 8A.4, 8A.6 | `apps/web/src/app/(citizen)/report/page.tsx` | Done |
| II | Server vs Client Components, fetch, caching, revalidation | Server Components in `/my`, `/track`, client forms in `/report` | 8A.3, 8A.5 | `apps/web/src/app/(citizen)/my/page.tsx` | Done |
| III | Route Handlers, REST, HTTP methods, dynamic handlers | `/api/public/stats`, `/api/revalidate` | 8A.8 | `apps/web/src/app/api/public/stats/route.ts`, `apps/web/src/app/api/revalidate/route.ts` | Done |
| III | Server Actions, form handling, validation, file upload, data mutations | `submitComplaintAction`, `loginAction`, `registerAction` | 8A.4, 8A.7 | `apps/web/src/lib/complaint-actions.ts`, `apps/web/src/lib/auth-actions.ts` | Done |
| IV | Authentication concepts, session management, protected routes | Signed httpOnly cookie session, route protection middleware | 8A.2 | `apps/web/src/middleware.ts` | Done |
| IV | Authorization, role-based access control | Role verification in API middleware and frontend guards | 8A.2 | `apps/api/src/middleware/auth.ts` | Done |
| IV | ORM basics, DB connectivity, CRUD, data validation, env variables | Mongoose models with 2dsphere indexes, Zod validation | 8A.9 | `packages/domain/src/models/complaint.ts`, `packages/shared/src/schemas.ts` | Done |
| V | Image optimisation, Metadata API, SEO, sitemap | Metadata API, `/sitemap.xml`, `/robots.txt` | 8A.10 | `apps/web/src/app/sitemap.ts`, `apps/web/src/app/robots.ts` | Done |
| V | Production build, env config, deployment, error logging | Production build verification, pino logger | 8A.12 | `apps/api/src/app.ts`, `apps/web/next.config.ts` | Done |
| VI | Parallel routes | `/nearby` with `@map` and `@list` slots | 8A.6 | `apps/web/src/app/(public)/nearby/layout.tsx`, `apps/web/src/app/(public)/nearby/@map/page.tsx` | Done |
| VI | Internationalization | Bilingual Hindi & English labels and text classifier | 8A.1b | `packages/domain/src/services/seed.ts`, `packages/domain/src/services/text-classifier.ts` | Done |
| VI | Project architecture, component organisation, security practices | Monorepo architecture, boundary validation, test gates | 8A.11, 7.10 | `packages/domain/src/index.ts`, `docs/design.md` | Done |
