
export interface Member {
  id: string;
  name: string;
  phone: string;
  email: string;
  user_id: string; // Added missing user_id property
  isActive: boolean;
  hasReceived: boolean;
  hasWon?: boolean; // Added missing hasWon property
  isCreator?: boolean; // Added missing isCreator property
  joinedAt: Date;
  contributionStatus?: 'pending' | 'paid';
  lastPaymentDate?: Date | null;
}

export interface ChitGroup {
  id: string;
  name: string;
  description: string;
  monthlyAmount: number;
  totalMembers: number;
  currentMembers: number;
  duration: number; // in months
  startDate: Date;
  nextDrawDate: Date;
  drawDay: string; // Day of month when draw happens (e.g., "1", "15")
  status: 'forming' | 'active' | 'completed';
  groupType: 'lucky_draw' | 'bidding'; // Type of bhishi group
  createdBy: string;
  createdAt: Date;
  members: Member[];
  winners: WinnerRecord[];
  // Bidding-specific fields
  currentRound?: BidRound;
  bidHistory?: BidRound[];
}

export interface WinnerRecord {
  id: string;
  memberId: string;
  memberName: string;
  amount: number;
  drawDate: Date;
  round: number;
}

export interface Payment {
  id: string;
  groupId: string;
  memberId: string;
  amount: number;
  month: number;
  year: number;
  status: 'pending' | 'paid' | 'overdue';
  paidAt?: Date;
}

// Bidding System Types
export interface BidRound {
  id: string;
  groupId: string;
  roundNumber: number;
  status: 'open' | 'active' | 'closed' | 'completed';
  startTime: Date;
  endTime?: Date;
  minimumBid: number;
  winnerId?: string;
  winnerName?: string;
  winningBid?: number;
  prizeAmount: number;
  totalBids: number;
  currentLowestBid?: number;
  bids: MemberBid[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MemberBid {
  id: string;
  roundId: string;
  memberId: string;
  memberName: string;
  bidAmount: number;
  bidTime: Date;
  isActive: boolean;
  isWinning?: boolean; // Indicates if this is currently the lowest bid
}

export interface BiddingStats {
  totalRounds: number;
  completedRounds: number;
  activeRounds: number;
  userWins: number;
  userTotalBids: number;
  averageBidAmount: number;
  lowestSuccessfulBid: number;
  highestSuccessfulBid: number;
}
