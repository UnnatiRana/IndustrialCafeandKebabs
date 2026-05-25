import { useEffect, useState, type ReactNode } from "react";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import type { StaffRole } from "../types/domain";

type AuthGateProps = {
  children: ReactNode;
};

type StaffSession = {
  email: string;
  role: StaffRole;
};

export function AuthGate({ children }: AuthGateProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState<StaffSession | null>(
    isSupabaseConfigured ? null : { email: "demo.manager@industrial.local", role: "manager" },
  );
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    let isMounted = true;

    async function loadSession() {
      const { data } = await supabase!.auth.getUser();
      const user = data.user;
      if (!user) {
        if (isMounted) setIsLoading(false);
        return;
      }

      const { data: staffProfile, error: profileError } = await supabase!
        .from("users")
        .select("email, role")
        .eq("id", user.id)
        .in("role", ["admin", "manager", "staff"])
        .maybeSingle();

      if (isMounted) {
        if (profileError || !staffProfile) {
          setError("This account is not authorized for staff dashboard access.");
        } else {
          setSession({ email: staffProfile.email, role: staffProfile.role as StaffRole });
        }
        setIsLoading(false);
      }
    }

    void loadSession();
    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!supabase) {
      setSession({ email: "demo.manager@industrial.local", role: "manager" });
      setIsLoading(false);
      return;
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      setError(authError?.message ?? "Unable to sign in.");
      setIsLoading(false);
      return;
    }

    const { data: staffProfile, error: profileError } = await supabase
      .from("users")
      .select("email, role")
      .eq("id", authData.user.id)
      .in("role", ["admin", "manager", "staff"])
      .maybeSingle();

    if (profileError || !staffProfile) {
      await supabase.auth.signOut();
      setError("This account is not authorized for staff dashboard access.");
      setIsLoading(false);
      return;
    }

    setSession({ email: staffProfile.email, role: staffProfile.role as StaffRole });
    setIsLoading(false);
  }

  async function handleSignOut() {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSession(isSupabaseConfigured ? null : { email: "demo.manager@industrial.local", role: "manager" });
  }

  if (isLoading) {
    return <main className="centered-page">Checking staff access...</main>;
  }

  if (!session) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <LockKeyhole aria-hidden="true" />
          <h1>Staff admin access</h1>
          <p>Sign in with a Supabase user whose profile role is admin, manager, or staff.</p>
          <form onSubmit={handleSignIn}>
            <label>
              Email
              <input
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </label>
            <label>
              Password
              <input
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </label>
            {error ? <p className="error-text">{error}</p> : null}
            <button className="primary-button" type="submit">
              Sign in
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <>
      <header className="staff-bar">
        <div>
          <ShieldCheck aria-hidden="true" />
          <span>
            Signed in as {session.email} ({session.role})
          </span>
        </div>
        {!isSupabaseConfigured ? (
          <span className="demo-badge">Local demo mode - configure Supabase for production auth</span>
        ) : null}
        <button className="ghost-button" onClick={handleSignOut} type="button">
          Sign out
        </button>
      </header>
      {children}
    </>
  );
}
