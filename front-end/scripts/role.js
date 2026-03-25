// role.js — Role-Based UI Rendering

function renderUI() {
  const user = getCurrentUser();
  if (!user) return;

  // Show user name + role in header if elements exist
  const nameEl = document.getElementById('headerUserName');
  const roleEl = document.getElementById('headerUserRole');
  const avatarEl = document.getElementById('headerAvatar');
  if (nameEl) nameEl.textContent = user.name;
  if (roleEl) roleEl.textContent = capitalize(user.role);
  if (avatarEl) avatarEl.textContent = user.name.charAt(0).toUpperCase();

  // Show the correct role panel
  const superPanel = document.getElementById('superPanel');
  const adminPanel = document.getElementById('adminPanel');
  const userPanel  = document.getElementById('userPanel');

  if (superPanel) superPanel.style.display = 'none';
  if (adminPanel) adminPanel.style.display = 'none';
  if (userPanel)  userPanel.style.display  = 'none';

  if (user.role === 'superuser' && superPanel) {
    superPanel.style.display = 'block';
  } else if (user.role === 'admin' && adminPanel) {
    adminPanel.style.display = 'block';
  } else if (user.role === 'user' && userPanel) {
    userPanel.style.display = 'block';
  }

  // Hide nav items restricted for specific roles
  applyNavRestrictions(user.role);
}

function applyNavRestrictions(role) {
  // Items allowed per role
  const restrictions = {
    admin: ['users', 'reports', 'settings', 'returns', 'delivery'],
    user:  ['users', 'reports', 'settings', 'returns', 'delivery', 'inventory']
  };
  const hidden = restrictions[role] || [];
  hidden.forEach(page => {
    const el = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (el) el.style.display = 'none';
  });
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}
