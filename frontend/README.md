# Voice Bot Frontend

The user-facing interface for the Voice Bot ecosystem. Built with **React 18**, **Vite**, and **TailwindCSS**.

## 🎨 Design System

The frontend features a custom "Midnight" design system:
-   **Theme**: Dark mode prioritized (`slate-950`).
-   **Glassmorphism**: Heavy use of backdrop filters and semi-transparent borders.
-   **Animations**: **Framer Motion** powers the smooth entry transitions and the reactive audio visualizer.
-   **Icons**: **Lucide React** for consistent iconography.

## 📁 Structure

```
src/
├── assets/           # Static images/media
├── components/       # (Refactored) Reusable UI components
├── VoiceBot.jsx      # Main application logic (VAD, Recording, Playback)
├── App.jsx           # Routing and Layout wrapper
├── index.css         # Global styles and Tailwind imports
└── main.jsx          # Entry point
```

## 🛠️ Development

### Setup
```bash
npm install
```

### Run Dev Server
```bash
npm run dev
```
Runs usually on `http://localhost:5173`.

### Build for Production
```bash
npm run build
```
Output will be in `dist/`.

## 🔗 Connection

The frontend expects the backend API to be running at `http://localhost:8000`.
-   **POST /api/voice-chat**: Main endpoint for audio blobs.
-   **POST /api/chat**: Text-only fallback endpoint.
