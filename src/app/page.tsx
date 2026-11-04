import Link from "next/link";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  CalendarCheck,
  Trophy,
  Award,
  Search,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F4F3EE] text-[#101820]">
      <Navbar />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-32 border-b border-[#DCE1E3]">
          <div className="container mx-auto px-4 sm:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Column */}
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#DCE1E3] text-xs font-semibold uppercase tracking-wider text-[#202A32] shadow-sm">
                  <span className="flex h-2 w-2 rounded-full bg-[#C6F432] ring-2 ring-[#C6F432]/40" />
                  <span>Multi-Tenant Sports Academy Platform</span>
                </div>

                <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight uppercase leading-[1.05] text-[#101820]">
                  DEVELOP ATHLETES. <br />
                  <span className="text-[#101820]">DISCOVER CHAMPIONS.</span>
                </h1>

                <p className="text-base sm:text-lg text-[#8B969E] max-w-xl font-normal leading-relaxed">
                  One platform to manage your sports academy, track athlete development, measure performance and connect emerging talent with scouts.
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                  <Link href="/register-academy">
                    <Button variant="athletic" size="lg" className="w-full sm:w-auto text-sm font-bold gap-2 shadow-sm">
                      <span>Launch Your Academy</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full sm:w-auto text-sm font-semibold border-[#DCE1E3] bg-white text-[#101820] hover:bg-[#F4F3EE]"
                    >
                      Sign In To Dashboard
                    </Button>
                  </Link>
                </div>

                {/* Key Invariant Highlights */}
                <div className="pt-8 grid grid-cols-3 gap-6 border-t border-[#DCE1E3]">
                  <div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-[#101820] tracking-tight">100%</div>
                    <div className="text-[11px] font-medium uppercase tracking-wider text-[#8B969E] mt-0.5">
                      Data Isolation
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-[#101820] tracking-tight">&ge; 75%</div>
                    <div className="text-[11px] font-medium uppercase tracking-wider text-[#8B969E] mt-0.5">
                      Attendance Gate
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-[#101820] tracking-tight">&ge; 2</div>
                    <div className="text-[11px] font-medium uppercase tracking-wider text-[#8B969E] mt-0.5">
                      Verified Matches
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Clean Athlete Performance Card */}
              <div className="lg:col-span-5">
                <div className="relative mx-auto max-w-md rounded-2xl border border-[#DCE1E3] bg-white p-6 shadow-sm">
                  {/* Top Header */}
                  <div className="flex items-center justify-between pb-5 border-b border-[#DCE1E3]">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#C6F432] ring-4 ring-[#C6F432]/30" />
                      <span className="text-xs font-bold uppercase tracking-wider text-[#101820]">
                        Verified Talent Radar
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-[#8B969E] uppercase tracking-wider">
                      Live Metric Engine
                    </span>
                  </div>

                  {/* Athlete Mock Card Body */}
                  <div className="py-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[11px] font-medium uppercase tracking-wider text-[#8B969E]">
                          Player Identification
                        </div>
                        <div className="text-base font-bold text-[#101820]">Marcus Vance</div>
                        <div className="text-xs text-[#8B969E]">Forward • Under-19 Squad</div>
                      </div>
                      <div className="px-2.5 py-1 rounded-md bg-[#C6F432] text-[#101820] text-[11px] font-bold uppercase tracking-wider shadow-sm">
                        Trial Eligible
                      </div>
                    </div>

                    <div className="rounded-xl bg-[#F4F3EE] p-4 space-y-3 border border-[#DCE1E3]">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[#202A32] font-semibold">Attendance Record</span>
                        <span className="text-[#101820] font-bold">88.5% (Threshold &ge;75%)</span>
                      </div>
                      <div className="w-full bg-[#DCE1E3] h-2 rounded-full overflow-hidden">
                        <div className="bg-[#101820] h-full w-[88.5%] rounded-full" />
                      </div>

                      <div className="flex justify-between items-center text-xs pt-1">
                        <span className="text-[#202A32] font-semibold">Competitive Matches</span>
                        <span className="text-[#101820] font-bold">4 Matches (Min &ge;2)</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-[#202A32] font-medium bg-[#F4F3EE]/60 p-3 rounded-lg border border-[#DCE1E3]">
                      <CheckCircle2 className="h-4 w-4 text-[#101820] shrink-0" />
                      <span>Tamper-proof practice sessions & verified rosters</span>
                    </div>
                  </div>

                  <div className="pt-3 text-center border-t border-[#DCE1E3]">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#8B969E]">
                      Automated Mathematical Evaluation Engine
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES GRID */}
        <section id="features" className="py-20 lg:py-28 border-b border-[#DCE1E3]">
          <div className="container mx-auto px-4 sm:px-8 space-y-14">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#DCE1E3] text-[11px] font-bold uppercase tracking-wider text-[#202A32]">
                <Sparkles className="h-3.5 w-3.5 text-[#101820]" />
                <span>Architecture & Features</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#101820] uppercase">
                Engineered For Sports Academies
              </h2>
              <p className="text-sm text-[#8B969E]">
                Purpose-built modules to streamline operations, eliminate guesswork, and surface verified athletic talent.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Feature 1 */}
              <div className="rounded-xl border border-[#DCE1E3] bg-white p-6 space-y-3 shadow-sm hover:border-[#101820]/40 transition-colors">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#F4F3EE] border border-[#DCE1E3] text-[#101820]">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-[#101820]">Multi-Tenant Isolation</h3>
                <p className="text-xs text-[#8B969E] leading-relaxed">
                  Every academy operates in a strictly isolated environment. Automatic server-side query scoping prevents any cross-tenant data leakage.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="rounded-xl border border-[#DCE1E3] bg-white p-6 space-y-3 shadow-sm hover:border-[#101820]/40 transition-colors">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#F4F3EE] border border-[#DCE1E3] text-[#101820]">
                  <CalendarCheck className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-[#101820]">Practice Attendance Locking</h3>
                <p className="text-xs text-[#8B969E] leading-relaxed">
                  Coaches log daily practice sessions and mark attendance. Once closed, attendance records are locked and become immutable.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="rounded-xl border border-[#DCE1E3] bg-white p-6 space-y-3 shadow-sm hover:border-[#101820]/40 transition-colors">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#F4F3EE] border border-[#DCE1E3] text-[#101820]">
                  <Trophy className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-[#101820]">Match Performance Records</h3>
                <p className="text-xs text-[#8B969E] leading-relaxed">
                  Record competitive matches linked to practice sessions. Absent players are automatically disqualified from match rosters.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="rounded-xl border border-[#DCE1E3] bg-white p-6 space-y-3 shadow-sm hover:border-[#101820]/40 transition-colors">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#F4F3EE] border border-[#DCE1E3] text-[#101820]">
                  <Award className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-[#101820]">Automated Eligibility Engine</h3>
                <p className="text-xs text-[#8B969E] leading-relaxed">
                  Real-time mathematical evaluation determining trial readiness based on strict &ge;75% attendance and &ge;2 verified matches.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="rounded-xl border border-[#DCE1E3] bg-white p-6 space-y-3 shadow-sm hover:border-[#101820]/40 transition-colors">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#F4F3EE] border border-[#DCE1E3] text-[#101820]">
                  <Search className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-[#101820]">Dedicated Scout Radar</h3>
                <p className="text-xs text-[#8B969E] leading-relaxed">
                  Scouts linked to coach cohorts gain direct access to verified trial-ready talent profiles with historical performance statistics.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="rounded-xl border border-[#DCE1E3] bg-white p-6 space-y-3 shadow-sm hover:border-[#101820]/40 transition-colors">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#F4F3EE] border border-[#DCE1E3] text-[#101820]">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-[#101820]">Role-Tailored Dashboards</h3>
                <p className="text-xs text-[#8B969E] leading-relaxed">
                  Tailored views for Platform Admins, Academy Owners, Coaches, Scouts, and Players with real-time operational insights.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* WORKFLOW SECTION */}
        <section id="how-it-works" className="py-20 lg:py-28 border-b border-[#DCE1E3]">
          <div className="container mx-auto px-4 sm:px-8 space-y-14">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8B969E]">Operational Flow</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#101820] uppercase">
                From Academy Onboarding To Scout Discovery
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-3 p-6 rounded-xl bg-white border border-[#DCE1E3] shadow-sm">
                <div className="text-2xl font-black text-[#101820]">01</div>
                <h3 className="text-base font-bold text-[#101820]">Onboard Academy</h3>
                <p className="text-xs text-[#8B969E] leading-relaxed">
                  Register your sports academy, configure sports disciplines, and invite head coaches.
                </p>
              </div>

              <div className="space-y-3 p-6 rounded-xl bg-white border border-[#DCE1E3] shadow-sm">
                <div className="text-2xl font-black text-[#101820]">02</div>
                <h3 className="text-base font-bold text-[#101820]">Log Daily Practice</h3>
                <p className="text-xs text-[#8B969E] leading-relaxed">
                  Coaches mark attendance for each practice session and lock the record upon completion.
                </p>
              </div>

              <div className="space-y-3 p-6 rounded-xl bg-white border border-[#DCE1E3] shadow-sm">
                <div className="text-2xl font-black text-[#101820]">03</div>
                <h3 className="text-base font-bold text-[#101820]">Record Match Performance</h3>
                <p className="text-xs text-[#8B969E] leading-relaxed">
                  Track goals, assists, points, and ratings for players present in practice sessions.
                </p>
              </div>

              <div className="space-y-3 p-6 rounded-xl bg-white border border-[#DCE1E3] shadow-sm">
                <div className="text-2xl font-black text-[#101820]">04</div>
                <h3 className="text-base font-bold text-[#101820]">Unlock Pro Scout Radar</h3>
                <p className="text-xs text-[#8B969E] leading-relaxed">
                  Athletes meeting attendance and match criteria surface automatically in scout directories.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SPORTS DISCIPLINES */}
        <section id="sports" className="py-16 border-b border-[#DCE1E3]">
          <div className="container mx-auto px-4 sm:px-8 text-center space-y-8">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8B969E]">
              Supported Disciplines
            </span>
            <div className="flex flex-wrap items-center justify-center gap-3 max-w-3xl mx-auto">
              {["Football", "Basketball", "Cricket", "Tennis", "Hockey", "Rugby", "Badminton", "Athletics"].map(
                (sport) => (
                  <span
                    key={sport}
                    className="px-4 py-2 rounded-lg bg-white border border-[#DCE1E3] text-xs font-semibold text-[#101820] shadow-sm"
                  >
                    {sport}
                  </span>
                )
              )}
            </div>
          </div>
        </section>

        {/* CTA SECTION */}
        <section className="py-20 lg:py-28">
          <div className="container mx-auto px-4 sm:px-8">
            <div className="rounded-2xl border border-[#DCE1E3] bg-white p-8 sm:p-14 text-center max-w-4xl mx-auto space-y-6 shadow-sm">
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#101820] uppercase leading-tight">
                Elevate Your Academy To Professional Standards
              </h2>
              <p className="text-sm sm:text-base text-[#8B969E] max-w-xl mx-auto">
                Join forward-thinking sports academies managing athletes, tracking development, and opening trial opportunities on Athlix.
              </p>
              <div className="pt-2">
                <Link href="/register-academy">
                  <Button variant="athletic" size="lg" className="px-8 font-bold gap-2 shadow-sm">
                    <span>Register Academy Now</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
