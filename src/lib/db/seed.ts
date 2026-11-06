import mongoose from "mongoose";
import { connectToDatabase } from "./mongodb";
import {
  Academy,
  User,
  Coach,
  Scout,
  Player,
  PracticeSession,
  Attendance,
  Match,
  MatchParticipant,
  IdCounter,
  AcademyCodeCounter,
} from "@/models";
import { hashPassword } from "../auth/password";
import { generateAcademyCode, generateAthlixId } from "../id-generator";

export async function seedDatabase() {
  console.log("Connecting to database for seeding...");
  await connectToDatabase();

  console.log("Clearing existing data...");
  await Promise.all([
    Academy.deleteMany({}),
    User.deleteMany({}),
    Coach.deleteMany({}),
    Scout.deleteMany({}),
    Player.deleteMany({}),
    PracticeSession.deleteMany({}),
    Attendance.deleteMany({}),
    Match.deleteMany({}),
    MatchParticipant.deleteMany({}),
    IdCounter.deleteMany({}),
    AcademyCodeCounter.deleteMany({}),
  ]);

  // 1. Create Platform Super Admin
  const adminPassword = await hashPassword("AthlixAdmin2026!");
  const superAdmin = await User.create({
    role: "PLATFORM_ADMIN",
    name: "Platform Chief Executive",
    email: "superadmin@athlix.com",
    passwordHash: adminPassword,
    status: "ACTIVE",
  });
  console.log("Super Admin seeded: superadmin@athlix.com");

  // 2. Create Academy A (Apex Sports Academy in Greater London)
  const academyAId = new mongoose.Types.ObjectId();
  const ownerAId = new mongoose.Types.ObjectId();
  const ownerAPassword = await hashPassword("ApexOwner2026!");

  const ownerA = await User.create({
    _id: ownerAId,
    academyId: academyAId,
    role: "ACADEMY_OWNER",
    name: "Arthur Pendelton",
    email: "owner@apex.com",
    passwordHash: ownerAPassword,
    status: "ACTIVE",
  });

  const academyACode = await generateAcademyCode("Greater London");

  const academyA = await Academy.create({
    _id: academyAId,
    name: "Apex Elite Sports Academy",
    slug: "apex-elite",
    academyCode: academyACode,
    state: "Greater London",
    description: "Premier competitive training facility for future professional athletes.",
    location: {
      address: "100 Wembley Way",
      city: "London",
      state: "Greater London",
      country: "United Kingdom",
      postalCode: "HA9 0WS",
    },
    contactEmail: "contact@apex.com",
    contactPhone: "+44 20 7946 0991",
    ownerId: ownerAId,
    status: "ACTIVE",
  });
  console.log(`Academy A seeded: ${academyA.name} [Code: ${academyA.academyCode}]`);

  // 3. Create Coach 1 (Football) under Academy A
  const coach1UserId = new mongoose.Types.ObjectId();
  const coach1Id = new mongoose.Types.ObjectId();
  const coach1Password = await hashPassword("CoachMarcus2026!");

  const coach1Code = await generateAthlixId({
    academyId: academyAId,
    userType: "COACH",
    sport: "Football",
  });

  const coach1User = await User.create({
    _id: coach1UserId,
    academyId: academyAId,
    role: "COACH",
    name: "Marcus Cole",
    email: "coach.marcus@apex.com",
    passwordHash: coach1Password,
    coachId: coach1Id,
    status: "ACTIVE",
  });

  const coach1 = await Coach.create({
    _id: coach1Id,
    academyId: academyAId,
    userId: coach1UserId,
    coachCode: coach1Code,
    sport: "Football",
    specialization: "Attacking Tactics & High Pressing",
    experienceYears: 12,
    bio: "UEFA Pro License holder with over a decade of elite youth development.",
    status: "ACTIVE",
  });

  // 4. Create Scout 1 assigned to Coach 1
  const scout1UserId = new mongoose.Types.ObjectId();
  const scout1Id = new mongoose.Types.ObjectId();
  const scout1Password = await hashPassword("ScoutElena2026!");

  const scout1Code = await generateAthlixId({
    academyId: academyAId,
    userType: "SCOUT",
    sport: "Football",
  });

  const scout1User = await User.create({
    _id: scout1UserId,
    academyId: academyAId,
    role: "SCOUT",
    name: "Elena Rostova",
    email: "scout.elena@apex.com",
    passwordHash: scout1Password,
    coachId: coach1Id,
    status: "ACTIVE",
  });

  const scout1 = await Scout.create({
    _id: scout1Id,
    academyId: academyAId,
    userId: scout1UserId,
    assignedCoachId: coach1Id,
    scoutCode: scout1Code,
    organization: "Premier Talent Scout Network",
    experienceYears: 8,
    status: "ACTIVE",
  });

  coach1.assignedScoutId = scout1Id;
  await coach1.save();
  console.log(`Coach 1 (${coach1Code}) & Scout 1 (${scout1Code}) linked for Football`);

  // 5. Create Players under Coach 1
  // Player 1: Leo Sterling (READY candidate)
  const player1UserId = new mongoose.Types.ObjectId();
  const player1Id = new mongoose.Types.ObjectId();
  const player1Password = await hashPassword("PlayerLeo2026!");

  const player1Code = await generateAthlixId({
    academyId: academyAId,
    userType: "PLAYER",
    sport: "Football",
  });

  await User.create({
    _id: player1UserId,
    academyId: academyAId,
    role: "PLAYER",
    name: "Leo Sterling",
    email: "player.leo@apex.com",
    passwordHash: player1Password,
    playerId: player1Id,
    status: "ACTIVE",
  });

  const player1 = await Player.create({
    _id: player1Id,
    academyId: academyAId,
    coachId: coach1Id,
    userId: player1UserId,
    playerCode: player1Code,
    name: "Leo Sterling",
    dateOfBirth: new Date("2008-04-12"),
    gender: "MALE",
    sport: "Football",
    position: "Striker",
    enrollmentDate: new Date("2026-01-01"),
    status: "ACTIVE",
  });

  // Player 2: Marcus Vance (Low attendance -> NOT_READY)
  const player2Code = await generateAthlixId({
    academyId: academyAId,
    userType: "PLAYER",
    sport: "Football",
  });

  const player2 = await Player.create({
    academyId: academyAId,
    coachId: coach1Id,
    playerCode: player2Code,
    name: "Marcus Vance",
    dateOfBirth: new Date("2008-09-22"),
    gender: "MALE",
    sport: "Football",
    position: "Midfielder",
    enrollmentDate: new Date("2026-01-01"),
    status: "ACTIVE",
  });

  // Player 3: Zayn Croft (Only 1 match -> NOT_READY)
  const player3Code = await generateAthlixId({
    academyId: academyAId,
    userType: "PLAYER",
    sport: "Football",
  });

  const player3 = await Player.create({
    academyId: academyAId,
    coachId: coach1Id,
    playerCode: player3Code,
    name: "Zayn Croft",
    dateOfBirth: new Date("2007-11-05"),
    gender: "MALE",
    sport: "Football",
    position: "Center Back",
    enrollmentDate: new Date("2026-01-01"),
    status: "ACTIVE",
  });

  console.log(`3 Players created under Coach Marcus: ${player1Code}, ${player2Code}, ${player3Code}`);

  // 6. Create Practice Sessions (4 Closed Sessions)
  const sessionDates = [
    new Date("2026-02-10"),
    new Date("2026-02-15"),
    new Date("2026-02-20"),
    new Date("2026-02-25"),
  ];

  const sessions = [];
  for (let i = 0; i < sessionDates.length; i++) {
    const s = await PracticeSession.create({
      academyId: academyAId,
      coachId: coach1Id,
      sport: "Football",
      date: sessionDates[i],
      title: `Tactical Drill Phase ${i + 1}`,
      status: "CLOSED",
      closedAt: new Date(sessionDates[i].getTime() + 2 * 3600 * 1000),
      closedBy: coach1UserId,
    });
    sessions.push(s);
  }

  // Attendance Records:
  // Session 1: All 3 Present
  await Attendance.create({ academyId: academyAId, sessionId: sessions[0]._id, playerId: player1._id, status: "PRESENT", recordedBy: coach1UserId });
  await Attendance.create({ academyId: academyAId, sessionId: sessions[0]._id, playerId: player2._id, status: "PRESENT", recordedBy: coach1UserId });
  await Attendance.create({ academyId: academyAId, sessionId: sessions[0]._id, playerId: player3._id, status: "PRESENT", recordedBy: coach1UserId });

  // Session 2: Leo (P), Marcus (A), Zayn (P)
  await Attendance.create({ academyId: academyAId, sessionId: sessions[1]._id, playerId: player1._id, status: "PRESENT", recordedBy: coach1UserId });
  await Attendance.create({ academyId: academyAId, sessionId: sessions[1]._id, playerId: player2._id, status: "ABSENT", recordedBy: coach1UserId });
  await Attendance.create({ academyId: academyAId, sessionId: sessions[1]._id, playerId: player3._id, status: "PRESENT", recordedBy: coach1UserId });

  // Session 3: Leo (P), Marcus (A), Zayn (P)
  await Attendance.create({ academyId: academyAId, sessionId: sessions[2]._id, playerId: player1._id, status: "PRESENT", recordedBy: coach1UserId });
  await Attendance.create({ academyId: academyAId, sessionId: sessions[2]._id, playerId: player2._id, status: "ABSENT", recordedBy: coach1UserId });
  await Attendance.create({ academyId: academyAId, sessionId: sessions[2]._id, playerId: player3._id, status: "PRESENT", recordedBy: coach1UserId });

  // Session 4: Leo (P), Marcus (P), Zayn (P)
  await Attendance.create({ academyId: academyAId, sessionId: sessions[3]._id, playerId: player1._id, status: "PRESENT", recordedBy: coach1UserId });
  await Attendance.create({ academyId: academyAId, sessionId: sessions[3]._id, playerId: player2._id, status: "PRESENT", recordedBy: coach1UserId });
  await Attendance.create({ academyId: academyAId, sessionId: sessions[3]._id, playerId: player3._id, status: "PRESENT", recordedBy: coach1UserId });

  console.log("Practice sessions and attendance recorded");

  // 7. Create Matches (2 Matches linked to sessions 1 & 4)
  const match1 = await Match.create({
    academyId: academyAId,
    coachId: coach1Id,
    sessionId: sessions[0]._id,
    date: sessions[0].date,
    sport: "Football",
    opponentName: "Arsenal Youth Academy",
    venue: "Emirates Youth Stadium",
    scoreLabel: "Goals",
    academyTeamScore: 3,
    opponentScore: 1,
    result: "WON",
  });

  await MatchParticipant.create({
    academyId: academyAId,
    matchId: match1._id,
    playerId: player1._id,
    score: 2,
    minutesPlayed: 90,
  });

  await MatchParticipant.create({
    academyId: academyAId,
    matchId: match1._id,
    playerId: player3._id,
    score: 0,
    minutesPlayed: 90,
  });

  const match2 = await Match.create({
    academyId: academyAId,
    coachId: coach1Id,
    sessionId: sessions[3]._id,
    date: sessions[3].date,
    sport: "Football",
    opponentName: "Chelsea Development Squad",
    venue: "Cobham Training Ground",
    scoreLabel: "Goals",
    academyTeamScore: 2,
    opponentScore: 1,
    result: "WON",
  });

  await MatchParticipant.create({
    academyId: academyAId,
    matchId: match2._id,
    playerId: player1._id,
    score: 1,
    minutesPlayed: 85,
  });

  console.log("Matches and participant sheets recorded");

  // 8. Create Academy B (Independent multi-tenant isolation demonstration)
  const academyBId = new mongoose.Types.ObjectId();
  const ownerBId = new mongoose.Types.ObjectId();
  const ownerBPassword = await hashPassword("VanguardOwner2026!");

  await User.create({
    _id: ownerBId,
    academyId: academyBId,
    role: "ACADEMY_OWNER",
    name: "Victoria Sterling",
    email: "owner@vanguard.com",
    passwordHash: ownerBPassword,
    status: "ACTIVE",
  });

  const academyBCode = await generateAcademyCode("New York");

  await Academy.create({
    _id: academyBId,
    name: "Vanguard Basketball Academy",
    slug: "vanguard-basketball",
    academyCode: academyBCode,
    state: "New York",
    description: "East Coast premier basketball development program.",
    location: {
      address: "500 Madison Ave",
      city: "New York",
      state: "New York",
      country: "United States",
      postalCode: "10022",
    },
    contactEmail: "info@vanguard.com",
    contactPhone: "+1 212 555 0188",
    ownerId: ownerBId,
    status: "ACTIVE",
  });
  console.log(`Academy B seeded: Vanguard Basketball [Code: ${academyBCode}]`);

  console.log("Database seed successfully completed!");
}

// Run standalone if executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Seeding error:", err);
      process.exit(1);
    });
}
