export type ConferenceDate = "2026-09-23" | "2026-09-24";

export type ActivityType =
  | "Masters Keynote"
  | "Free Papers"
  | "Symposium"
  | "Panel Discussion"
  | "Posters";

export type ThematicAxis =
  | "Violence"
  | "Gender"
  | "Education"
  | "Law"
  | "Health"
  | "Regional Development"
  | "Migration";

export type VenueId = "hall-1" | "hall-2" | "hall-3" | "hall-4";

export type SpeakerRole = "speaker" | "moderator" | "chair";

export interface Speaker {
  name: string;
  institution: string;
  role: SpeakerRole;
}

export interface Author {
  name: string;
  institution: string;
}

export interface ConferenceEvent {
  id: string;
  date: ConferenceDate;
  startTime: string;
  endTime: string;
  title: string;
  venueId: VenueId;
  venueLabel: string;
  activityType: ActivityType;
  thematicAxis: ThematicAxis;
  speakers: Speaker[];
  authors: Author[];
  abstract: string;
}

export const VENUES: Record<VenueId, string> = {
  "hall-1": "Hall 1 · Convention Center",
  "hall-2": "Hall 2 · Audiovisual",
  "hall-3": "Hall 3 · Multipurpose",
  "hall-4": "Hall 4 · Master's Room",
};

export const DATE_LABELS: Record<ConferenceDate, string> = {
  "2026-09-23": "Wednesday, September 23",
  "2026-09-24": "Thursday, September 24",
};

export const DATE_SHORT_LABELS: Record<ConferenceDate, string> = {
  "2026-09-23": "Wed, Sep 23",
  "2026-09-24": "Thu, Sep 24",
};

export const ACTIVITY_TYPES: ActivityType[] = [
  "Masters Keynote",
  "Free Papers",
  "Symposium",
  "Panel Discussion",
  "Posters",
];

export const THEMATIC_AXES: ThematicAxis[] = [
  "Violence",
  "Gender",
  "Education",
  "Law",
  "Health",
  "Regional Development",
  "Migration",
];

export const VENUE_IDS: VenueId[] = ["hall-1", "hall-2", "hall-3", "hall-4"];