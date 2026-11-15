import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { Brand } from "../../components/Brand";
import "../Landing/landing.css";
import "../../styles/app.css";
import "./AuthPage.css";

export function SignupPage(): JSX.Element {
  const { user, signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) return <Navigate to="/app" replace />;

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await signup(name, email, password);
      navigate("/app", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign up");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="landing-page app-page auth-page">
      <div className="auth-wrap">
        <div className="card auth-card">
          <Brand linkTo="/" />
          <h1>Create your account</h1>
          <p className="muted">Upload a chapter, build question papers, and keep them under your own account.</p>
          <form onSubmit={handleSubmit}>
            <label className="field">
              <span>Name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
            </label>
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
                autoComplete="new-password"
                minLength={8}
                required
              />
              <span>At least 8 characters.</span>
            </label>
            {error && <p className="error" role="alert">{error}</p>}
            <button type="submit" disabled={submitting}>
              {submitting ? "Creating account…" : "Sign up"}
            </button>
          </form>
          <p className="auth-switch">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
