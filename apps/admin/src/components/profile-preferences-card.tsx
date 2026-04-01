'use client';

import { useState } from 'react';
import { apiPatch } from '../lib/api';
import { persistConsoleLanguage } from '../lib/i18n';
import { useConsoleI18n } from '../lib/use-console-i18n';

type Props = {
  initialLanguage: string;
  initialTimezone: string;
  initialEmail: boolean;
  initialSms: boolean;
  initialPush: boolean;
};

export function ProfilePreferencesCard({
  initialLanguage,
  initialTimezone,
  initialEmail,
  initialSms,
  initialPush,
}: Props) {
  const { t } = useConsoleI18n();
  const [language, setLanguage] = useState(initialLanguage || 'en');
  const [timezone, setTimezone] = useState(initialTimezone || 'Africa/Addis_Ababa');
  const [email, setEmail] = useState(initialEmail);
  const [sms, setSms] = useState(initialSms);
  const [push, setPush] = useState(initialPush);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setStatus(null);
    try {
      await apiPatch('/me/preferences', {
        language,
        timezone,
        notificationPreferences: { email, sms, push },
      });
      persistConsoleLanguage(language === 'am' ? 'am' : 'en', { explicit: true });
      setStatus('Preferences saved.');
    } catch (error) {
      console.error('Failed to save preferences', error);
      setStatus('Unable to save preferences right now.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card workspace-detail-card">
      <div className="workspace-section-header">
        <div>
          <div className="eyebrow">Preferences</div>
          <h3>Language and notifications</h3>
        </div>
      </div>
      <div className="workspace-filter-grid">
        <label className="workspace-filter-field">
          <span>Language</span>
          <select value={language} onChange={(event) => setLanguage(event.target.value)}>
            <option value="en">{t('languageEnglish', 'English')}</option>
            <option value="am">{t('languageAmharic', 'Amharic')}</option>
          </select>
        </label>
        <label className="workspace-filter-field">
          <span>Timezone</span>
          <input value={timezone} onChange={(event) => setTimezone(event.target.value)} />
        </label>
      </div>
      <div className="workspace-detail-list">
        <label className="workspace-detail-row">
          <div className="workspace-cell-stack">
            <strong>Email alerts</strong>
            <span>Operational and finance notification emails</span>
          </div>
          <input type="checkbox" checked={email} onChange={(event) => setEmail(event.target.checked)} />
        </label>
        <label className="workspace-detail-row">
          <div className="workspace-cell-stack">
            <strong>SMS alerts</strong>
            <span>Urgent alerts to phone</span>
          </div>
          <input type="checkbox" checked={sms} onChange={(event) => setSms(event.target.checked)} />
        </label>
        <label className="workspace-detail-row">
          <div className="workspace-cell-stack">
            <strong>Push alerts</strong>
            <span>In-console and mobile push messages</span>
          </div>
          <input type="checkbox" checked={push} onChange={(event) => setPush(event.target.checked)} />
        </label>
      </div>
      <div className="workspace-filter-actions">
        {status ? <div className="label">{status}</div> : null}
        <button type="button" className="btn btn-secondary btn-compact" onClick={() => void save()} disabled={saving}>
          {saving ? 'Saving...' : 'Save preferences'}
        </button>
      </div>
    </section>
  );
}
