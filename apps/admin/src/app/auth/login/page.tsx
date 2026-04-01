import { LoginHeroCarousel } from './login-hero-carousel';
import { LoginForm } from './login-form';

export default function AdminLoginPage() {
  return (
    <main className="login-page-shell">
      <div className="login-layout-shell">
        <LoginHeroCarousel />
        <div className="login-page-panel">
          <LoginForm />
          <footer className="login-footer">
            <span>&copy; Tikur Abay Transport</span>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Support</a>
          </footer>
        </div>
      </div>
    </main>
  );
}
