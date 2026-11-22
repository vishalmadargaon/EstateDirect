import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../context/AppStoreContext';
import { DEMO_SLUG } from '../data/seedData';

export function Navbar() {
  const { currentProfile } = useAppStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleSectionNav = (sectionId: string) => {
    setMobileOpen(false);
    if (location.pathname !== '/') {
      navigate('/');
      window.setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      }, 120);
    } else {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FAF7F2]/95 border-b border-[#17120F]/[0.08]">
      <div className="max-w-[1240px] mx-auto px-5 sm:px-8 h-[68px] flex items-center justify-between gap-8">
        {/* Zone 1: Brand lockup */}
        <Link
          to="/"
          className="flex items-center gap-2.5 whitespace-nowrap shrink-0 group"
          aria-label="EstateDirect Home"
        >
          <span className="w-9 h-9 rounded-xl bg-white border border-[#17120F]/12 overflow-hidden flex items-center justify-center shadow-xs transition-transform duration-200 group-hover:scale-105">
            <img
              src="/assets/aistudio/Gemini_Generated_Image_e7l37be7l37be7l3_741afc4d.png"
              alt="EstateDirect logo"
              className="w-8 h-8 object-contain"
            />
          </span>
          <span className="text-[19px] font-bold tracking-[-0.03em] text-[#17120F]">
            EstateDirect
          </span>
        </Link>

        {/* Zone 2: Clean single-line navigation links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-[#17120F]/75"
        >
          <button
            type="button"
            onClick={() => handleSectionNav('features')}
            className="hover:text-[#17120F] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Features
          </button>
          <Link
            to={`/c/${DEMO_SLUG}`}
            className="hover:text-[#17120F] transition-colors whitespace-nowrap shrink-0"
          >
            Live Demo
          </Link>
          <Link
            to="/studio"
            className="hover:text-[#17120F] transition-colors whitespace-nowrap shrink-0"
          >
            3D Studio
          </Link>
          <button
            type="button"
            onClick={() => handleSectionNav('about')}
            className="hover:text-[#17120F] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            About
          </button>
          <Link
            to="/contact"
            className="hover:text-[#17120F] transition-colors whitespace-nowrap shrink-0"
          >
            Contact
          </Link>
        </nav>

        {/* Zone 3: Auth & primary action */}
        <div className="hidden md:flex items-center gap-4 shrink-0">
          {currentProfile ? (
            <Link
              to="/dashboard"
              className="px-5 py-2.5 rounded-full bg-[#17120F] text-[#FAF7F2] text-sm font-semibold hover:bg-[#261E19] transition-colors whitespace-nowrap shrink-0"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/auth?mode=login"
                className="text-sm font-semibold text-[#17120F]/80 hover:text-[#17120F] transition-colors whitespace-nowrap shrink-0 px-2 py-2"
              >
                Log in
              </Link>
              <Link
                to="/auth?mode=signup"
                className="px-5 py-2.5 rounded-full bg-[#17120F] text-[#FAF7F2] text-sm font-semibold hover:bg-[#261E19] transition-colors whitespace-nowrap shrink-0"
              >
                Start free
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="md:hidden w-11 h-11 rounded-full flex items-center justify-center text-[#17120F] hover:bg-[#EFE6D6]/60 transition-colors"
          aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="md:hidden bg-[#FAF7F2] border-b border-[#17120F]/10 px-5 py-5 space-y-3"
          >
            <div className="flex flex-col space-y-2 text-base font-medium">
              <button
                type="button"
                onClick={() => handleSectionNav('features')}
                className="text-left py-2 text-[#17120F]/85 hover:text-[#17120F]"
              >
                Features
              </button>
              <Link
                to={`/c/${DEMO_SLUG}`}
                onClick={() => setMobileOpen(false)}
                className="py-2 text-[#17120F]/85 hover:text-[#17120F]"
              >
                Live Demo
              </Link>
              <Link
                to="/studio"
                onClick={() => setMobileOpen(false)}
                className="py-2 text-[#17120F]/85 hover:text-[#17120F]"
              >
                3D Studio
              </Link>
              <button
                type="button"
                onClick={() => handleSectionNav('about')}
                className="text-left py-2 text-[#17120F]/85 hover:text-[#17120F]"
              >
                About
              </button>
              <Link
                to="/contact"
                onClick={() => setMobileOpen(false)}
                className="py-2 text-[#17120F]/85 hover:text-[#17120F]"
              >
                Contact
              </Link>
            </div>
            <div className="pt-3 border-t border-[#17120F]/10 flex items-center gap-3">
              {currentProfile ? (
                <Link
                  to="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="w-full text-center px-5 py-3 rounded-full bg-[#17120F] text-[#FAF7F2] text-sm font-semibold"
                >
                  Open Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/auth?mode=login"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center px-4 py-3 rounded-full border border-[#17120F]/20 text-sm font-semibold"
                  >
                    Log in
                  </Link>
                  <Link
                    to="/auth?mode=signup"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center px-4 py-3 rounded-full bg-[#17120F] text-[#FAF7F2] text-sm font-semibold"
                  >
                    Start free
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
