import { FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { Brand } from "../../components/Brand";
import "../Landing/landing.css";
import "../../styles/app.css";
import "./AuthPage.css";

export function LoginPage(): JSX.Element {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) {
    const from = (location.state as { from?: Location })?.from;
    return <Navigate to={from?.pathname ?? "/app"} replace />;
  }

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      const from = (location.state as { from?: Location })?.from;
      navigate(from?.pathname ?? "/app", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not log in");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="landing-page app-page auth-page">
      <div className="auth-wrap">
        <div className="card auth-card">
          <Brand linkTo="/" />
          <h1>Log in</h1>
          <p className="muted">Welcome back — your books and question papers are waiting.</p>
          <form onSubmit={handleSubmit}>
            <label className="field">
              <span>Email</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            {error && <p className="error" role="alert">{error}</p>}
            <button type="submit" disabled={submitting}>
              {submitting ? "Logging in…" : "Log in"}
            </button>
          </form>
          <p className="auth-switch">
            Don&apos;t have an account? <Link to="/signup">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
