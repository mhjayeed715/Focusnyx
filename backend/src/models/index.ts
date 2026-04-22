export interface UserProfile {
  id: string;
  universityEmail: string;
  displayName: string;
}

export interface BlockedSite {
  id: string;
  domain: string;
  isActive: boolean;
}
