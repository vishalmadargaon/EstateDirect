import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { ArchitecturalScene3D } from '../components/ArchitecturalScene3D';
import { DEMO_SLUG } from '../data/seedData';

export function Studio3DPage() {
  return (
    <div className="relative bg-[#17120F]">
      <ArchitecturalScene3D
        fullViewport
        title="Pali Hill Cantilevered Pavilion"
        subtitle="Drag to orbit · Scroll to zoom · Inspect daylight, facade stone & floorplan cutaway"
      />
      <Link
        to={`/c/${DEMO_SLUG}/p/aur-1001`}
        className="absolute top-4 right-4 sm:top-6 sm:right-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#FAF7F2] text-[#17120F] text-xs font-bold hover:bg-[#EFE6D6] transition-colors shadow-editorial"
      >
        View Listing Details
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
