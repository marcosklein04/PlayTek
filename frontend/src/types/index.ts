export interface User {
  id: string;
  email: string;
  organization: string;
  role: 'admin' | 'client';
  name: string;
  avatar?: string;
}

export interface Game {
  id: string;
  name: string;
  description: string;
  shortDescription: string;
  miniBio?: string;
  image: string;
  video?: string;
  category: GameCategory;
  modality: GameModality[];
  pricing: GamePricing;
  creditsCost?: number;
  features: string[];
  isPopular?: boolean;
  isNew?: boolean;
}

export type GameCategory = 
  | 'trivia'
  | 'interactive'
  | 'touchscreen'
  | 'multiplayer'
  | 'ar-vr'
  | 'social';

export type GameModality = 
  | 'corporate-events'
  | 'social-events'
  | 'touchscreens'
  | 'web-based'
  | 'mobile'
  | 'hybrid';

export interface GamePricing {
  type: 'subscription' | 'per-event' | 'one-time';
  price: number;
  currency: string;
  period?: 'month' | 'year' | 'event';
}

export interface ContractedGame extends Game {
  contractedAt: Date;
  status: 'active' | 'pending' | 'expired';
  configUrl?: string;
  operationUrl?: string;
}
