export type UserRole =
  | 'PLATFORM_ADMIN'
  | 'ACADEMY_OWNER'
  | 'COACH'
  | 'SCOUT'
  | 'PLAYER';

export type AcademyStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
export type UserStatus = 'ACTIVE' | 'INVITED' | 'DEACTIVATED';
export type PlayerStatus = 'ACTIVE' | 'INJURED' | 'DEACTIVATED';
export type SessionStatus = 'OPEN' | 'CLOSED';
export type AttendanceStatus = 'PRESENT' | 'ABSENT';
export type MatchResult = 'WON' | 'LOST' | 'DRAW' | 'ABANDONED';
export type EligibilityStatus = 'READY' | 'NOT_READY';
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';

export interface LocationData {
  address?: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
}

export interface IAcademy {
  _id: string;
  name: string;
  slug: string;
  logo?: string;
  description?: string;
  location: LocationData;
  contactEmail: string;
  contactPhone: string;
  ownerId: string;
  status: AcademyStatus;
  createdAt: string;
  updatedAt: string;
}

export interface IUser {
  _id: string;
  academyId?: string;
  role: UserRole;
  name: string;
  email: string;
  passwordHash?: string;
  status: UserStatus;
  coachId?: string;
  playerId?: string;
  metadata?: {
    phone?: string;
    avatarUrl?: string;
    lastLoginAt?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ICoach {
  _id: string;
  academyId: string;
  userId: string;
  name?: string;
  email?: string;
  sport: string;
  specialization?: string;
  experienceYears?: number;
  bio?: string;
  assignedScoutId?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface IScout {
  _id: string;
  academyId: string;
  userId: string;
  name?: string;
  email?: string;
  assignedCoachId: string;
  organization?: string;
  experienceYears?: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface IPlayer {
  _id: string;
  academyId: string;
  coachId: string;
  userId?: string;
  playerCode: string;
  name: string;
  dateOfBirth: string;
  age?: number;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  sport: string;
  position: string;
  photoUrl?: string;
  enrollmentDate: string;
  contact?: {
    phone?: string;
    email?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
  };
  status: PlayerStatus;
  createdAt: string;
  updatedAt: string;
}

export interface IPracticeSession {
  _id: string;
  academyId: string;
  coachId: string;
  sport: string;
  date: string;
  title?: string;
  timeSlot?: {
    startTime: string;
    endTime: string;
  };
  status: SessionStatus;
  closedAt?: string;
  closedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IAttendance {
  _id: string;
  academyId: string;
  coachId: string;
  sessionId: string;
  playerId: string;
  status: AttendanceStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IMatch {
  _id: string;
  academyId: string;
  coachId: string;
  sessionId: string;
  date: string;
  sport: string;
  opponentName: string;
  venue?: string;
  scoreLabel: string; // e.g. "Goals", "Runs", "Points"
  academyTeamScore: number;
  opponentScore: number;
  result: MatchResult;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IMatchParticipant {
  _id: string;
  academyId: string;
  matchId: string;
  playerId: string;
  score: number;
  minutesPlayed?: number;
  performanceNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IInvitation {
  _id: string;
  academyId: string;
  email: string;
  role: 'COACH' | 'SCOUT' | 'PLAYER';
  token: string;
  coachId?: string;
  sport?: string;
  invitedBy: string;
  expiresAt: string;
  status: InvitationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface IAuditLog {
  _id: string;
  academyId?: string;
  actorId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

export interface IEligibilityCalculation {
  playerId: string;
  playerName: string;
  sport: string;
  position: string;
  enrollmentDate: string;
  totalClosedSessions: number;
  presentSessions: number;
  absentSessions: number;
  attendancePercentage: number;
  matchesPlayed: number;
  totalScore: number;
  averageScore: number;
  status: EligibilityStatus;
  reasons: string[];
  isAttendanceMet: boolean;
  isMatchesMet: boolean;
}

export interface AuthSessionPayload {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  academyId?: string;
  coachId?: string;
  playerId?: string;
  iat?: number;
  exp?: number;
}
