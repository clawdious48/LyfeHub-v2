# APM — Apex Project Management

APM is the React frontend for LyfeHub, a personal productivity and business operations platform. It provides a neon glassmorphic dark-mode UI covering personal modules (Tasks, Calendar, Notes, People, Bases) and enterprise job management for Apex Restoration (Jobs, CRM, Inventory, Documents, Workflows, Accounting, Reports).

## Tech Stack

- React 19, TypeScript, Vite
- Tailwind CSS v4
- TanStack Query (data fetching)
- Zustand (client state)
- shadcn/ui (component library)
- @dnd-kit (drag-and-drop)
- react-grid-layout (dashboard widgets)
- framer-motion (animations)
- Lucide React (icons)
- React Router (routing)

## Getting Started

```bash
npm install
npm run dev
```

The dev server runs on `http://localhost:5174`.

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```
VITE_GOOGLE_CLIENT_ID=your-google-client-id-here
```

## Backend

This frontend proxies `/api/*` requests to a backend server on port 3000. The backend (Node/Express + PostgreSQL) must be running for API calls to work. See the LyfeHub-v2 repo for backend setup.
