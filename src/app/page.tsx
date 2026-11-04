import Link from "next/link";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { Button } from "@/components/ui/button";
import {
  Zap,
  ShieldCheck,
  Award,
  Users,
  Trophy,
  CalendarCheck,
  Search,
  ArrowRight,
  CheckCircle,
  Activity,
  Flame,
  Target,
  BarChart3,
  Layers,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-athletic-black selection:bg-athletic-lime selection:text-athletic-black">
      <Navbar />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden pt-12 pb-24 lg:pt-20 lg:pb-36 border-b border-athletic-border/50">
          {/* Subtle grid background */}
          <div className="absolute inset-0 athletic-grid opacity-20 pointer-events-none" />
          
          {/* Neon Radial Gradient */}
          <div className="absolute -top-40 right-1/4 w-[600px] h-[600px] bg-athletic-lime/10 rounded-full blur-[140px] pointer-events-none" />

          <div className="container relative mx-auto px-4 sm:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Column: Bold Editorial Copy */}
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-athletic-charcoal border border-athletic-border text-xs font-bold uppercase tracking-widest text-athletic-lime">
                  <Flame className="h-4 w-4 fill-athletic-lime" />
                  <span>The Enterprise Sports Academy Operating System</span>
                </div>

                <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black italic tracking-tighter uppercase leading-[0.9] text-white">
                  POWERING <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-athletic-lime via-white to-athletic-lime">
                    NEXT-GEN
                  </span>{" "}
                  <br />
                  CHAMPIONS.
                </h1>

                <p className="text-base sm:text-lg text-athletic-textMuted max-w-xl font-normal leading-relaxed">
                  Digitize sports academy operations, enforce practice attendance immutability, record competitive match performance, and automatically scout trial-ready talent through an objective eligibility engine.
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4">
                  <Link href="/register-academy">
                    <Button variant="athletic" size="lg" className="w-full sm:w-auto text-base gap-3">
                      <span>Launch Your Academy</span>
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button variant="secondary" size="lg" className="w-full sm:w-auto text-base">
                      Sign In To Dashboard
                    </Button>
                  </Link>
                </div>

                {/* Key Invariant Highlights */}
                <div className="pt-8 grid grid-cols-3 gap-6 border-t border-athletic-border/50">
                  <div>
                    <div className="text-2xl sm:text-3xl font-black italic text-white tracking-tight">100%</div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-athletic-textMuted mt-0.5">
                      Tenant Isolation
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-black italic text-athletic-lime tracking-tight">75%+</div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-athletic-textMuted mt-0.5">
                      Trial Attendance Gate
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-black italic text-white tracking-tight">&ge; 2</div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-athletic-textMuted mt-0.5">
                      Verified Matches
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Athletic Hero Graphic Card */}
              <div className="lg:col-span-5 relative">
                <div className="relative mx-auto max-w-md rounded-2xl border-2 border-athletic-border bg-athletic-charcoal p-6 shadow-2xl athletic-glow">
                  {/* Neon Top Badge */}
                  <div className="flex items-center justify-between pb-6 border-b border-athletic-border/60">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-athletic-lime animate-pulse" />
                      <span className="text-xs font-black uppercase tracking-widest text-athletic-lime">
                        LIVE SCOUTING RADAR
                      </span>
                    </div>
                    <span className="text-xs font-bold text-athletic-textMuted">REAL-TIME</span>
                  </div>

                  {/* Athlete Mock Card */}
                  <div className="py-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold uppercase text-athletic-textMuted">ATHLETE CODE</div>
                        <div className="text-lg font-black text-white">FTB-2026-8842</div>
                      </div>
                      <div className="px-3 py-1 rounded bg-athletic-lime/15 border border-athletic-lime/40 text-athletic-lime text-xs font-black uppercase tracking-wider shadow-[0_0_10px_rgba(163,255,0,0.3)]">
                        TRIAL READY
                      </div>
                    </div>

                    <div className="rounded-lg bg-athletic-black p-4 space-y-3 border border-athletic-border/60">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-athletic-textMuted uppercase font-bold">Attendance Rate</span>
                        <span className="text-athletic-lime font-black text-sm">88.5% (Meets &ge; 75%)</span>
                      </div>
                      <div className="w-full bg-athletic-charcoal h-2 rounded-full overflow-hidden">
                        <div className="bg-athletic-lime h-full w-[88.5%]" />
                      </div>

                      <div className="flex justify-between items-center text-xs pt-1">
                        <span className="text-athletic-textMuted uppercase font-bold">Match Appearances</span>
                        <span className="text-white font-black text-sm">4 Matches (Meets &ge; 2)</span>
                      </div>
                    </div>

                    {/* Invariant badge */}
                    <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-semibold bg-emerald-950/40 p-2.5 rounded border border-emerald-900/50">
                      <CheckCircle className="h-4 w-4 shrink-0" />
                      <span>Absent players strictly locked out from match sheets</span>
                    </div>
                  </div>

                  <div className="pt-2 text-center border-t border-athletic-border/60">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-athletic-textMuted">
                      AUTOMATED MATHEMATICAL EVALUATION ENGINE
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES GRID */}
        <section id="features" className="py-24 border-b border-athletic-border/50 bg-athletic-charcoal/30">
          <div className="container mx-auto px-4 sm:px-8 space-y-16">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <h2 className="text-xs font-black uppercase tracking-widest text-athletic-lime">
                ENTERPRISE CAPABILITIES
              </h2>
              <h3 className="text-4xl sm:text-5xl font-black italic tracking-tight text-white uppercase">
                ENGINEERED FOR SERIOUS ACADEMIES.
              </h3>
              <p className="text-sm text-athletic-textMuted">
                Everything required to operate top-tier sports academies without cross-tenant interference or spreadsheets.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="rounded-xl border border-athletic-border bg-athletic-charcoal p-8 space-y-4 hover:border-athletic-lime/50 transition-colors">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-athletic-black border border-athletic-border text-athletic-lime">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h4 className="text-xl font-black italic uppercase text-white">Multi-Tenant Isolation</h4>
                <p className="text-xs text-athletic-textMuted leading-relaxed">
                  Every academy operates in absolute isolation. Automatic server-side query scoping guarantees no academy, coach, or player can ever access unauthorized data.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="rounded-xl border border-athletic-border bg-athletic-charcoal p-8 space-y-4 hover:border-athletic-lime/50 transition-colors">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-athletic-black border border-athletic-border text-athletic-lime">
                  <CalendarCheck className="h-6 w-6" />
                </div>
                <h4 className="text-xl font-black italic uppercase text-white">Practice Attendance Locking</h4>
                <p className="text-xs text-athletic-textMuted leading-relaxed">
                  Coaches open sessions, mark attendance, and close them. Once closed, the records become tamper-proof and immutable for honest attendance audits.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="rounded-xl border border-athletic-border bg-athletic-charcoal p-8 space-y-4 hover:border-athletic-lime/50 transition-colors">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-athletic-black border border-athletic-border text-athletic-lime">
                  <Trophy className="h-6 w-6" />
                </div>
                <h4 className="text-xl font-black italic uppercase text-white">Match & Scorekeeping</h4>
                <p className="text-xs text-athletic-textMuted leading-relaxed">
                  Matches link directly to verified practice sessions. The engine strictly rejects absent players from match sheets, ensuring integrity in competition records.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="rounded-xl border border-athletic-border bg-athletic-charcoal p-8 space-y-4 hover:border-athletic-lime/50 transition-colors">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-athletic-black border border-athletic-border text-athletic-lime">
                  <Award className="h-6 w-6" />
                </div>
                <h4 className="text-xl font-black italic uppercase text-white">Automated Eligibility Engine</h4>
                <p className="text-xs text-athletic-textMuted leading-relaxed">
                  Calculates whether players qualify for professional trials (&ge;75% attendance + &ge;2 matches played) without manual overrides or guesswork.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="rounded-xl border border-athletic-border bg-athletic-charcoal p-8 space-y-4 hover:border-athletic-lime/50 transition-colors">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-athletic-black border border-athletic-border text-athletic-lime">
                  <Search className="h-6 w-6" />
                </div>
                <h4 className="text-xl font-black italic uppercase text-white">Dedicated Scout Directory</h4>
                <p className="text-xs text-athletic-textMuted leading-relaxed">
                  Scouts are assigned to specific coaches and get a high-density, read-only talent directory revealing exclusively trial-ready athletes with verified stats.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="rounded-xl border border-athletic-border bg-athletic-charcoal p-8 space-y-4 hover:border-athletic-lime/50 transition-colors">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-athletic-black border border-athletic-border text-athletic-lime">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <h4 className="text-xl font-black italic uppercase text-white">Role-Specific Dashboards</h4>
                <p className="text-xs text-athletic-textMuted leading-relaxed">
                  Tailored portals for Platform Admins, Academy Owners, Coaches, Scouts, and individual Players displaying real-time database analytics.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="py-24 border-b border-athletic-border/50">
          <div className="container mx-auto px-4 sm:px-8 space-y-16">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <h2 className="text-xs font-black uppercase tracking-widest text-athletic-lime">WORKFLOW</h2>
              <h3 className="text-4xl sm:text-5xl font-black italic tracking-tight text-white uppercase">
                FROM ENROLLMENT TO PRO SCOUTING.
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
              <div className="space-y-3 p-6 rounded-lg bg-athletic-charcoal border border-athletic-border">
                <div className="text-3xl font-black italic text-athletic-lime">01</div>
                <h4 className="text-base font-black uppercase text-white">Academy Onboarding</h4>
                <p className="text-xs text-athletic-textMuted">
                  Register your academy, invite head coaches, and assign dedicated talent scouts.
                </p>
              </div>

              <div className="space-y-3 p-6 rounded-lg bg-athletic-charcoal border border-athletic-border">
                <div className="text-3xl font-black italic text-athletic-lime">02</div>
                <h4 className="text-base font-black uppercase text-white">Daily Practice</h4>
                <p className="text-xs text-athletic-textMuted">
                  Coaches mark attendance for each practice session and lock the session immutably.
                </p>
              </div>

              <div className="space-y-3 p-6 rounded-lg bg-athletic-charcoal border border-athletic-border">
                <div className="text-3xl font-black italic text-athletic-lime">03</div>
                <h4 className="text-base font-black uppercase text-white">Match Day Scores</h4>
                <p className="text-xs text-athletic-textMuted">
                  Create matches linked to practice sessions. Field only present players and track goals, runs, or points.
                </p>
              </div>

              <div className="space-y-3 p-6 rounded-lg bg-athletic-charcoal border border-athletic-border">
                <div className="text-3xl font-black italic text-athletic-lime">04</div>
                <h4 className="text-base font-black uppercase text-white">Scout Radar</h4>
                <p className="text-xs text-athletic-textMuted">
                  When a player reaches &ge;75% attendance and &ge;2 matches, they unlock on the scout talent radar.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SPORTS SUPPORTED */}
        <section id="sports" className="py-20 border-b border-athletic-border/50 bg-athletic-charcoal/20">
          <div className="container mx-auto px-4 sm:px-8 text-center space-y-10">
            <h3 className="text-xs font-black uppercase tracking-widest text-athletic-lime">
              MULTI-DISCIPLINE PLATFORM
            </h3>
            <div className="flex flex-wrap items-center justify-center gap-6 max-w-4xl mx-auto">
              {["FOOTBALL", "BASKETBALL", "CRICKET", "TENNIS", "HOCKEY", "RUGBY", "BADMINTON", "ATHLETICS"].map(
                (sport) => (
                  <div
                    key={sport}
                    className="px-6 py-3 rounded-md bg-athletic-charcoal border border-athletic-border text-sm font-black italic tracking-wider text-white uppercase hover:border-athletic-lime hover:text-athletic-lime transition-all"
                  >
                    {sport}
                  </div>
                )
              )}
            </div>
          </div>
        </section>

        {/* FINAL REGISTRATION CTA */}
        <section className="py-24 relative overflow-hidden">
          <div className="container mx-auto px-4 sm:px-8 text-center space-y-8 relative z-10">
            <h2 className="text-4xl sm:text-6xl font-black italic uppercase tracking-tight text-white max-w-3xl mx-auto leading-tight">
              ELEVATE YOUR ACADEMY TO PROFESSIONAL STANDARDS.
            </h2>
            <p className="text-sm sm:text-base text-athletic-textMuted max-w-xl mx-auto">
              Join sports academies managing rosters, matches, and trial pipelines on Athlix today.
            </p>
            <div className="pt-4">
              <Link href="/register-academy">
                <Button variant="athletic" size="lg" className="px-10 text-base gap-3">
                  <span>Register Academy Now</span>
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
