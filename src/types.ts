export interface Habit {
  id: string;
  user_id?: string;
  title: string;
  category: string;
  icon: string;
  time: string;
  duration: number;
  days: number[];
  archived: boolean;
  created_at: string;
}
export interface Completion {
  habit_id: string;
  date: string;
  user_id?: string;
}
export interface ClassItem {
  id: string;
  user_id?: string;
  title: string;
  day: number;
  start: string;
  end: string;
  room: string;
}
export interface Goal {
  id: string;
  user_id?: string;
  title: string;
  target: number;
  current: number;
  unit: string;
  category: string;
}
export interface Journal {
  date: string;
  content: string;
  mood: string;
  user_id?: string;
}
export interface Profile {
  name: string;
  timezone: string;
  onboarded: boolean;
}
export interface AppData {
  habits: Habit[];
  completions: Completion[];
  classes: ClassItem[];
  goals: Goal[];
  journals: Journal[];
  profile: Profile;
}
export type Page =
  | "home"
  | "routines"
  | "schedule"
  | "stats"
  | "goals"
  | "journal"
  | "profile";
