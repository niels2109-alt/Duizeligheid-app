// Spiegelt de respons van server/src/episodes.ts (requirements §8.4/§8.5 stap 4).

export interface EpisodeSummary {
  id: string;
  aandoeningId: string;
  aandoeningNaam: string;
  gestartOp: string;
  aantalSessies: number;
}

export interface EpisodeTrendFollowup {
  id: string;
  bevinding: string | null;
  timestamp: string;
}

export interface EpisodeTrendSessie {
  id: string;
  gestartOp: string;
  followup: EpisodeTrendFollowup[];
}

export interface EpisodeTrend {
  id: string;
  aandoeningId: string;
  aandoeningNaam: string;
  gestartOp: string;
  status: string;
  sessies: EpisodeTrendSessie[];
}
