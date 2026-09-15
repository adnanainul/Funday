export type User = {
  id: string;
  username: string;
  rating: number;
};

export type Problem = {
  id: string;
  title: string;
  description: string;
  examples: Array<{ input: string; output: string; explanation?: string }>;
  constraints: string[];
  difficulty: string;
};

export type MatchState = 'WAITING' | 'STARTING' | 'IN_PROGRESS' | 'COMPLETED';

export type PlayerState = {
  id: string;
  username: string;
  status: 'CONNECTED' | 'DISCONNECTED';
  typing?: boolean;
  running?: boolean;
  submitted?: boolean;
};

export type Match = {
  id: string;
  type: '1V1' | 'TOURNAMENT' | 'CONTEST';
  status: MatchState;
  problem?: Problem;
  players: PlayerState[];
  winnerId?: string;
};
