// Core types for the checklist app
export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface ReminderSettings {
  id: string;
  checklistId: string;
  reminderType: 'time_based' | 'completion_based' | 'smart_contextual';
  scheduledTime?: Date;
  reminderText: string;
  isEnabled: boolean;
  createdAt: Date;
}

export interface SmartNotification {
  id: string;
  type: 'reminder' | 'suggestion' | 'completion_celebration' | 'weekly_summary';
  title: string;
  message: string;
  actionData?: any;
  isRead: boolean;
  createdAt: Date;
  scheduledFor?: Date;
}

export interface ChecklistItem {
  id: string;
  title: string;
  description?: string;
  quantity?: number;
  unit?: string;
  isCompleted: boolean;
  order: number;
  checklistId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Checklist {
  id: string;
  title: string;
  description?: string;
  isTemplate: boolean;
  isPublic: boolean;
  peopleCount?: number;
  userId: string;
  categoryId?: string;
  createdAt: Date;
  updatedAt: Date;
  user: User;
  category?: Category | null;
  items: ChecklistItem[];
  _count: {
    likes: number;
    reviews: number;
    comments: number;
  };
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
}

export interface CreateChecklistData {
  title: string;
  description?: string;
  isTemplate?: boolean;
  isPublic?: boolean;
  peopleCount?: number;
  categoryId?: string;
  items: {
    title: string;
    description?: string;
    quantity?: number;
    unit?: string;
    order: number;
  }[];
}

export interface SituationTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  peopleMultiplier: boolean;
  items: TemplateItem[];
}

export interface TemplateItem {
  title: string;
  description?: string;
  baseQuantity?: number;
  unit?: string;
  multiplier?: number;
}

// Navigation types
export type RootStackParamList = {
  Main: undefined;
  ChecklistDetail: { id: string };
  Home: undefined;
  MyChecklists: undefined;
  Create: undefined;
};

export type BottomTabParamList = {
  Home: undefined;
  MyChecklists: undefined;
  Create: undefined;
};