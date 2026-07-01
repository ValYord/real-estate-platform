export type Locale = 'hy' | 'ru' | 'en';
export type DealType = 'sale' | 'rent';
export type PropertyType =
  | 'apartment'
  | 'house'
  | 'commercial'
  | 'land'
  | 'garage';
export type ListingStatus =
  | 'active'
  | 'draft'
  | 'pending'
  | 'archived'
  | 'sold';
export type Currency = 'AMD' | 'USD' | 'EUR' | 'RUB';

export interface LocalizedString {
  hy?: string;
  ru?: string;
  en?: string;
}

export interface Property {
  id: number;
  slug: string;
  title: LocalizedString;
  description: LocalizedString;
  price: number;
  currency: Currency;
  area_m2: number;
  rooms: number;
  bedrooms: number;
  bathrooms: number;
  floor?: number;
  floors_total?: number;
  year_built?: number;
  property_type: PropertyType;
  deal_type: DealType;
  status: ListingStatus;
  city: string;
  district?: string;
  lat: number;
  lng: number;
  amenities: string[];
  created_at: string;
  listed_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: 'user' | 'agent' | 'admin';
  tier: 'free' | 'pro' | 'premium';
}
