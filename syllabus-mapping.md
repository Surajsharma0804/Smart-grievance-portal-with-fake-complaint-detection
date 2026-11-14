# Syllabus Mapping

Copy this file to `docs/syllabus-mapping.md` in the repo. The **File** column starts empty and is filled with real paths as each task is finished. Use it in the viva and report: for each topic, you can open the file and show it working.

Status values: Planned, Done, N/A (with reason).

## INT252: Web App Development with ReactJS (apps/admin, plus client parts of apps/web)

| Unit | Topic | Where it is used in this project | Task | File | Status |
|---|---|---|---|---|---|
| I | Arrow functions, let/const, array methods, destructuring, spread/rest, ES modules | Everywhere; deliberately visible in `lib/` utilities such as grouping complaints by status, building query strings | 8B.1 | | Planned |
| I | Immutability, shallow vs deep copy, referential equality | Redux slice updates, Zustand updates, memoised rows depend on stable references | 8B.5, 8B.8 | | Planned |
| I | SPA vs MPA | Staff console is an SPA; citizen portal is server-rendered. Compared in README | 8B.1 | | Planned |
| I | Vite setup, feature-based folders, JSX, Virtual DOM | `apps/admin` structure | 8B.1 | | Planned |
| II | Composition, props-driven reuse, conditional rendering, lifting state up | `DataTable` compound components, `StatusBadge`, `Field` wrapper, filter bar lifting state to the queue page | 8B.8 | | Planned |
| II | Tailwind, responsive breakpoints, utility-first patterns | All staff screens; responsive table to card layout | 8B.1, 8B.10 | | Planned |
| II | Accessibility, semantic HTML | Landmarks, labelled controls, axe checks | 8B.11 | | Planned |
| III | Events, `useState`, batching, derived state | Filters, selection, modal state; derived "overdue" flag computed, not stored | 8B.4, 8B.8 | | Planned |
| III | `useEffect`, dependency arrays, cleanup | `useSSE` subscription cleanup, geolocation watcher cleanup | 8B.9 | | Planned |
| III | `useContext` | Auth, Theme, Locale contexts | 8B.3 | | Planned |
| III | `useCallback`, `useMemo`, `React.memo` | Large complaint table rows, map markers, with Profiler before/after numbers | 8B.8 | | Planned |
| III | Custom hooks, rules of hooks | `useDebounce`, `useSSE`, `useMediaQuery`, `useGeolocation` | 8B.9 | | Planned |
| IV | Controlled and uncontrolled components | Controlled admin forms; uncontrolled search box and GeoJSON file input via refs | 8B.7 | | Planned |
| IV | Form submission workflow, reusable form components, accessibility | `Field`, `SelectField`, error association with `aria-describedby` | 8B.7 | | Planned |
| IV | Zod, schema-based validation, integration with form logic | Shared schemas from `packages/shared` used with React Hook Form resolvers | 8B.7 | | Planned |
| V | REST, Fetch and Axios, loading/error/empty states | Axios instance with interceptors; reusable state components | 8B.3, 8B.4 | | Planned |
| V | Client vs server state, limits of `useEffect` fetching, React Query, caching, background sync | Officer queue with refetch interval and focus refetch; short write-up of why not `useEffect` | 8B.4 | | Planned |
| V | Routing: dynamic, nested, layout, query params, protected, code splitting | Staff route tree | 8B.2 | | Planned |
| VI | Context for global state | Auth, theme, locale | 8B.3 | | Planned |
| VI | Redux Toolkit: slices, actions, selectors, async logic | Review workspace slice and decision thunk | 8B.5 | | Planned |
| VI | Zustand | UI preferences with persistence | 8B.6 | | Planned |
| VI | Choosing local vs global vs server state | Table in `design.md` §10.3 and README | 8B.5 | | Planned |
| VI | DevTools, Profiler, build optimisation, env variables, deployment | Profiler write-up, Vite env files, production build deployed on Vercel | 8B.8, 8B.12 | | Planned |

## INT257: Modern Web Application Development (apps/web)

| Unit | Topic | Where it is used in this project | Task | File | Status |
|---|---|---|---|---|---|
| I | Next.js fundamentals, project structure, App Router, dev workflow | `apps/web` | 8A.1 | | Planned |
| I | File-based, dynamic, nested routes, layouts, navigation, error and loading UI | `/[locale]/track/[id]`, route groups, `loading.tsx`, `error.tsx`, `not-found.tsx` | 8A.1, 8A.5 | | Planned |
| II | SSG | Landing, how-it-works | 8A.3 | | Planned |
| II | ISR | `/stats`, `/departments` with on-demand `revalidateTag` | 8A.3 | | Planned |
| II | SSR | Tracking page | 8A.5 | | Planned |
| II | Client-side rendering and strategy selection | Report wizard, map; rationale table in `design.md` §10.1 | 8A.4, 8A.6 | | Planned |
| II | Server vs Client Components, fetch, caching, revalidation | `/my`, `/stats`, client islands for SSE and map | 8A.3, 8A.5 | | Planned |
| III | Route Handlers, REST, HTTP methods, dynamic handlers, request/response handling | `/api/public/stats`, `/api/complaints/[id]`, `/api/uploads/presign` | 8A.8 | | Planned |
| III | Server Actions, form handling, validation, file upload, data mutations | `submitComplaint`, `submitFeedback`, `reopenComplaint` | 8A.4, 8A.7 | | Planned |
| III | Optimistic UI | Upvote with `useOptimistic` | 8A.7 | | Planned |
| IV | Authentication concepts, session management, protected routes | Signed httpOnly session, `proxy.ts` | 8A.2 | | Planned |
| IV | Authorization, role-based access control | Role checks in server code, tested per role | 8A.2 | | Planned |
| IV | ORM basics, DB connectivity, CRUD, data validation, env variables | Mongoose (an ODM for MongoDB) for the Next.js-owned collections `savedAreas` and `notificationPrefs`, Zod validation, validated env | 8A.9 | | Planned |
| V | Image optimisation, Metadata API, code splitting, lazy loading, SEO | `next/image`, `generateMetadata`, sitemap and robots, `next/dynamic` | 8A.10 | | Planned |
| V | Production build, env config, deployment, monitoring, error logging | Vercel deployment, Web Vitals, Sentry and pino logging | 8A.12 | | Planned |
| VI | Parallel routes | `/nearby` with `@map` and `@list` | 8A.6 | | Planned |
| VI | Intercepting routes | Complaint modal over the map | 8A.6 | | Planned |
| VI | Proxy (formerly middleware) | `proxy.ts` for session and locale | 8A.2 | | Planned |
| VI | Edge runtime | `/api/geo/reverse` handler | 8A.8 | | Planned |
| VI | Internationalization | `next-intl`, English and Hindi | 8A.1b | | Planned |
| VI | Project architecture, component organisation, security practices, testing overview | Shared domain package, security section of `design.md`, Vitest and Playwright | 8A.11, 7.10 | | Planned |

## Notes for the viva
- Why two frontends: the public portal needs SEO, shareable links, and server rendering (Next.js); the staff tools are logged-in, highly interactive screens where a SPA is the natural fit (React + Vite).
- Why Express still exists: the analysis worker is long-running and keeps the CLIP model in memory, which does not suit serverless route handlers.
- Why Mongoose counts for the "ORM" topic: it is an object-document mapper, the MongoDB equivalent, with schemas, validation, and relations through references.
- What is honestly not a good fit: if a topic cannot be used naturally (for example deep Edge runtime features that need Node libraries), mark it N/A with the reason instead of forcing it in.
