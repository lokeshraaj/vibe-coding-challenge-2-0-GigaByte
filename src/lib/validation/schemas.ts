import { z } from "zod";

export const locationSchema = z.object({
  address: z.string().optional(),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  country: z.string().min(2, "Country is required"),
  postalCode: z.string().optional(),
});

export const academyRegisterSchema = z.object({
  academyName: z.string().min(2, "Academy name must be at least 2 characters").max(100),
  description: z.string().max(1000).optional(),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  country: z.string().min(2, "Country is required"),
  address: z.string().optional(),
  contactEmail: z.string().email("Invalid academy contact email"),
  contactPhone: z.string().min(6, "Valid contact phone is required"),
  ownerName: z.string().min(2, "Owner name must be at least 2 characters"),
  ownerEmail: z.string().email("Invalid owner email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export const loginSchema = z.object({
  email: z.string().min(1, "Email or ATHLIX ID is required"),
  password: z.string().min(1, "Password is required"),
});

export const coachInviteSchema = z.object({
  name: z.string().min(2, "Coach name must be at least 2 characters"),
  email: z.string().email("Valid email required"),
  phone: z.string().optional(),
  sport: z.string().min(2, "Sport is required"),
  specialization: z.string().optional(),
  experienceYears: z.coerce.number().min(0).default(0),
  bio: z.string().optional(),
});

export const verifyIdSchema = z.object({
  athlixId: z.string().min(6, "Valid ATHLIX ID is required").trim().toUpperCase(),
  role: z.enum(["COACH", "PLAYER"]),
});

export const verifyOtpSchema = z.object({
  athlixId: z.string().min(6).trim().toUpperCase(),
  otp: z
    .string()
    .length(6, "OTP must be exactly 6 digits")
    .regex(/^\d+$/, "OTP must contain only numbers"),
});

export const resendOtpSchema = z.object({
  athlixId: z.string().min(6).trim().toUpperCase(),
});

export const setPasswordSchema = z
  .object({
    activationToken: z.string().min(1, "Activation token is required"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const scoutInviteSchema = z.object({
  name: z.string().min(2, "Scout name must be at least 2 characters"),
  email: z.string().email("Valid email required"),
  assignedCoachId: z.string().min(1, "Assigned coach is required"),
  organization: z.string().optional(),
  experienceYears: z.coerce.number().min(0).default(0),
});

export const playerSchema = z.object({
  name: z.string().min(2, "Player name must be at least 2 characters"),
  dateOfBirth: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date of birth"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).default("MALE"),
  sport: z.string().min(2, "Sport is required"),
  position: z.string().min(2, "Position is required"),
  coachId: z.string().min(1, "Coach is required"),
  enrollmentDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid enrollment date"),
  photoUrl: z.string().url().optional().or(z.literal("")),
  contact: z
    .object({
      phone: z.string().optional(),
      email: z.string().email().optional().or(z.literal("")),
      emergencyContactName: z.string().optional(),
      emergencyContactPhone: z.string().optional(),
    })
    .optional(),
  createLoginAccount: z.boolean().default(false),
  accountPassword: z.string().min(8).optional(),
});

export const sessionCreateSchema = z.object({
  coachId: z.string().min(1, "Coach ID is required"),
  sport: z.string().min(2, "Sport is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  title: z.string().optional(),
  timeSlot: z
    .object({
      startTime: z.string(),
      endTime: z.string(),
    })
    .optional(),
});

export const attendanceRecordItemSchema = z.object({
  playerId: z.string().min(1, "Player ID is required"),
  status: z.enum(["PRESENT", "ABSENT"]),
  notes: z.string().max(200).optional(),
});

export const attendanceBatchSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
  records: z.array(attendanceRecordItemSchema).min(1, "At least one attendance record is required"),
});

export const sessionCloseSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
});

export const matchParticipantSchema = z.object({
  playerId: z.string().min(1, "Player ID is required"),
  score: z.coerce.number().min(0, "Score cannot be negative"),
  minutesPlayed: z.coerce.number().min(0).optional(),
  performanceNotes: z.string().max(500).optional(),
});

export const matchCreateSchema = z.object({
  coachId: z.string().min(1, "Coach ID is required"),
  sessionId: z.string().min(1, "Linked practice session ID is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in format YYYY-MM-DD"),
  sport: z.string().min(2, "Sport is required"),
  opponentName: z.string().min(2, "Opponent name must be at least 2 characters"),
  venue: z.string().optional(),
  scoreLabel: z.string().default("Score"),
  academyTeamScore: z.coerce.number().min(0),
  opponentScore: z.coerce.number().min(0),
  result: z.enum(["WON", "LOST", "DRAW", "ABANDONED"]).default("WON"),
  notes: z.string().optional(),
  participants: z.array(matchParticipantSchema).min(1, "Match must have at least one participating player"),
});
