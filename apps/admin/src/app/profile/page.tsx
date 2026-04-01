import { ProfilePreferencesCard } from '../../components/profile-preferences-card';
import { serverApiGet } from '../../lib/server-api';

export const dynamic = 'force-dynamic';

type Session = {
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  branch?: string;
  branchId?: string;
};

type Preferences = {
  language?: string;
  timezone?: string;
  notificationPreferences?: {
    email?: boolean;
    sms?: boolean;
    push?: boolean;
  };
};

export default async function ProfilePage() {
  const [session, preferences] = await Promise.all([
    serverApiGet<Session>('/me').catch(() => ({}) as Session),
    serverApiGet<Preferences>('/me/preferences').catch(() => ({}) as Preferences),
  ]);

  const fullName = session.name || `${session.firstName || ''} ${session.lastName || ''}`.trim() || 'Tikur Abay User';

  return (
    <main className="shell">
      <div className="panel workspace-shell">
        <section className="workspace-header">
          <div className="workspace-header-copy">
            <div className="eyebrow">Profile</div>
            <h1>{fullName}</h1>
            <p>Personal console settings, branch context, and role-specific identity information.</p>
          </div>
        </section>

        <section className="workspace-split-grid">
          <section className="card workspace-detail-card">
            <div className="workspace-section-header">
              <div>
                <div className="eyebrow">User Profile</div>
                <h3>Basic information</h3>
              </div>
            </div>
            <div className="workspace-metric-pair-grid">
              <MetricPair label="Name" value={fullName} />
              <MetricPair label="Role" value={labelize(session.role || 'user')} />
              <MetricPair label="Branch" value={session.branch || 'Unknown branch'} />
              <MetricPair label="Email" value={session.email || 'No email on file'} />
              <MetricPair label="Phone" value={session.phone || 'No phone on file'} />
              <MetricPair label="Password" value="Managed through admin identity rotation" />
            </div>
          </section>

          <ProfilePreferencesCard
            initialLanguage={preferences.language || 'en'}
            initialTimezone={preferences.timezone || 'Africa/Addis_Ababa'}
            initialEmail={Boolean(preferences.notificationPreferences?.email)}
            initialSms={Boolean(preferences.notificationPreferences?.sms)}
            initialPush={Boolean(preferences.notificationPreferences?.push)}
          />
        </section>

        <section className="card workspace-detail-card">
          <div className="workspace-section-header">
            <div>
              <div className="eyebrow">Role Context</div>
              <h3>Operational identity</h3>
            </div>
          </div>
          <div className="workspace-detail-list">
            <div className="workspace-detail-row">
              <div className="workspace-cell-stack">
                <strong>Console access</strong>
                <span>Role-based access is active for this account.</span>
              </div>
              <div className="label">{labelize(session.role || 'user')}</div>
            </div>
            <div className="workspace-detail-row">
              <div className="workspace-cell-stack">
                <strong>Branch scope</strong>
                <span>Current branch context used for dashboard and filters.</span>
              </div>
              <div className="label">{session.branch || 'Unknown branch'}</div>
            </div>
            <div className="workspace-detail-row">
              <div className="workspace-cell-stack">
                <strong>Identity notes</strong>
                <span>Use System Settings and User Access for permission or role changes.</span>
              </div>
              <div className="label">Admin managed</div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricPair({ label, value }: { label: string; value: string }) {
  return (
    <div className="workspace-metric-pair">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function labelize(value: string) {
  return value.replace(/_/g, ' ');
}
