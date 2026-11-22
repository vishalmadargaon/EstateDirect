import { Suspense, lazy, useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { X } from 'lucide-react';
import { AppStoreProvider, useAppStore } from './context/AppStoreContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Navbar } from './components/Navbar';
import { GeminiChatDrawer } from './components/GeminiChatDrawer';
import { SeoHeadManager } from './components/SeoHeadManager';
import { LandingPage } from './pages/LandingPage';

const AuthPage = lazy(() => import('./pages/AuthPage').then((m) => ({ default: m.AuthPage })));
const PublicCatalogPage = lazy(() =>
  import('./pages/PublicCatalogPage').then((m) => ({ default: m.PublicCatalogPage }))
);
const PropertyDetailPage = lazy(() =>
  import('./pages/PropertyDetailPage').then((m) => ({ default: m.PropertyDetailPage }))
);
const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
const Studio3DPage = lazy(() =>
  import('./pages/Studio3DPage').then((m) => ({ default: m.Studio3DPage }))
);
const ContactPage = lazy(() =>
  import('./pages/ContactPage').then((m) => ({ default: m.ContactPage }))
);

function RouteFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-[#FAF7F2]">
      <div className="w-8 h-8 rounded-full border-2 border-[#17120F]/15 border-t-[#C9A96E] animate-spin" />
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function ToastViewport() {
  const { toasts, dismissToast } = useAppStore();
  return (
    <div
      aria-live="polite"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 max-w-md w-[calc(100vw-2rem)] pointer-events-none"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className={`pointer-events-auto rounded-full px-5 py-3 text-sm font-semibold shadow-editorial-lg border flex items-center justify-between gap-3 ${
              toast.tone === 'error'
                ? 'bg-red-950 text-red-50 border-red-700'
                : 'bg-[#FAF7F2] text-[#17120F] border-[#C9A96E]'
            }`}
          >
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
              className={`shrink-0 ${
                toast.tone === 'error'
                  ? 'text-red-200 hover:text-white'
                  : 'text-[#17120F]/55 hover:text-[#17120F]'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.main
        key={location.pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
        <Suspense fallback={<RouteFallback />}>
          <Routes location={location}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/c/:slug" element={<PublicCatalogPage />} />
            <Route path="/c/:slug/p/:propertyId" element={<PropertyDetailPage />} />
            <Route path="/studio" element={<Studio3DPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </motion.main>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <AppStoreProvider>
          <HashRouter>
            <SeoHeadManager />
            <ScrollToTop />
            <Navbar />
            <AnimatedRoutes />
            <GeminiChatDrawer />
            <ToastViewport />
          </HashRouter>
        </AppStoreProvider>
      </MotionConfig>
    </ErrorBoundary>
  );
}
