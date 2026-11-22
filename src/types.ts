export type ListingKind = 'buy' | 'rent';
export type PropertyStatus = 'available' | 'sold' | 'rented';
export type ProjectStage =
  | 'upcoming'
  | 'new_launch'
  | 'under_construction'
  | 'nearing_possession'
  | 'ready_to_move';

export type CatalogCategoryFilter =
  | 'all'
  | 'upcoming'
  | 'under_construction'
  | 'ready_to_move'
  | 'land_plots'
  | 'villas_penthouses'
  | 'apartments';

export type LeadSource = 'whatsapp' | 'call' | 'visit' | 'meet';
export type LeadStatus = 'new' | 'contacted' | 'site_visit' | 'negotiation' | 'closed' | 'lost';
export type AnalyticsEventType =
  | 'catalog_view'
  | 'property_view'
  | 'whatsapp_click'
  | 'call_click'
  | 'qr_share';

export interface AgencyProfile {
  ownerId: string;
  slug: string;
  companyName: string;
  email: string;
  whatsapp: string;
  tagline: string;
  about: string;
  city: string;
  logoUrl?: string;
  createdAt: string;
}

export interface Property {
  id: string;
  ownerId: string;
  agencySlug: string;
  title: string;
  builderName?: string;
  description: string;
  locality: string;
  city: string;
  latitude?: number;
  longitude?: number;
  kind: ListingKind;
  propertyType: string;
  projectStage?: ProjectStage;
  phaseName?: string;
  possessionDate?: string;
  landArea?: string;
  totalUnits?: number;
  totalTowers?: string;
  price: number; // INR (total for buy, monthly for rent)
  beds: number;
  baths: number;
  sqft: number;
  parking: number;
  amenities: string[];
  approvals?: string[];
  reraApproved?: boolean;
  furnishing: 'Unfurnished' | 'Semi-Furnished' | 'Fully Furnished' | 'Designer Furnished';
  facing: 'North' | 'South' | 'East' | 'West' | 'North-East' | 'South-West' | 'Sea-Facing';
  floor: string;
  reraNumber: string;
  propertyCode: string;
  status: PropertyStatus;
  published: boolean;
  images: string[];
  autoWalkthroughVideo?: boolean;
  createdAt: string;
}

export interface Lead {
  id: string;
  ownerId: string;
  propertyId: string;
  propertyTitle: string;
  propertyCode: string;
  name: string;
  phone: string;
  email?: string;
  message: string;
  preferredDate?: string;
  preferredTime?: string;
  source: LeadSource;
  status: LeadStatus;
  notes: string;
  meetUri?: string;
  calendarEventLink?: string;
  createdAt: string;
}

export interface AnalyticsEvent {
  id: string;
  ownerId: string;
  propertyId?: string;
  eventType: AnalyticsEventType;
  createdAt: string;
}

export interface MeetTour {
  id: string;
  ownerId: string;
  propertyId: string;
  propertyTitle: string;
  clientName: string;
  meetingUri: string;
  meetingCode: string;
  scheduledAt: string;
  createdAt: string;
}

export interface CatalogFilters {
  kind: 'all' | ListingKind;
  category?: CatalogCategoryFilter;
  location?: string;
  reraOnly?: boolean;
  propertyType: string;
  minBeds: number;
  priceBand:
    | 'all'
    | 'under_1cr'
    | '1cr_3cr'
    | '3cr_6cr'
    | '6cr_plus'
    | '1cr_5cr'
    | '5cr_plus'
    | 'rent_under_1l'
    | 'rent_1l_plus';
  search: string;
  sortBy: 'featured' | 'price_asc' | 'price_desc' | 'sqft_desc';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  model?: string;
}

export interface ToastItem {
  id: string;
  message: string;
  tone: 'default' | 'success' | 'error';
}
