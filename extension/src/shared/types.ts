export interface FocusState {
  active: boolean;
  sessionId: string | null;
  blocklist: string[];
  allowedUrls: string[];
  userId: string | null;
  token: string | null;
  focusStartTime: number | null;
  focusDuration: number;
  focusPIN: string;
}

export interface BlockEvent {
  type?: string;
  url: string;
  timestamp: number;
  sessionId: string;
}
