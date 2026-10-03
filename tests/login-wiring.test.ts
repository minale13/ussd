import { describe, expect, it } from 'vitest';
import { DashboardLayout } from '../src/admin-ui/dashboard-layout.js';
import { CLIENT_SCRIPT } from '../src/admin-ui/client-script.js';

describe('login markup and client wiring', () => {
  it('ships the busy-state hooks the client drives', () => {
    const page = DashboardLayout('admin');
    expect(page).toContain('id="unlock-label"');
    expect(page).toContain('id="unlock-spinner"');
    expect(page).toContain('aria-live="assertive"');
    expect(CLIENT_SCRIPT).toContain('function setLoginPending');
    expect(CLIENT_SCRIPT).toContain('function authMessage');
  });

  it('reports a failed sign-in inside the login form, not only in the toast', () => {
    expect(CLIENT_SCRIPT).toContain("formFeedback('login-feedback', message, 'error')");
  });
});