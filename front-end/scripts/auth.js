// auth.js — Authentication & Role Logic

async function loadUsers() {
  try {
    let res = await fetch('../data/users.json');
    if (!res.ok) throw new Error();
    return await res.json();
  } catch(e) {
    let res = await fetch('data/users.json');
    return await res.json();
  }
}

async function login(username, password) {
  try {
    const users = await loadUsers();
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      localStorage.setItem("currentUser", JSON.stringify(user));
      localStorage.setItem("page", user.role);
      return user;
    }
  } catch(e) {
    console.error("Failed to load users:", e);
  }
  return null;
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("currentUser"));
  } catch (e) {
    return null;
  }
}

function isSuperUser() {
  return getCurrentUser()?.role === "superuser";
}

function isAdmin() {
  return getCurrentUser()?.role === "admin";
}

function isUser() {
  return getCurrentUser()?.role === "user";
}

function getPagesPrefix() {
  const path = window.location.pathname.replace(/\\/g, '/');
  return path.includes('/pages/') ? '' : 'pages/';
}

function logout() {
  localStorage.removeItem("currentUser");
  localStorage.removeItem("page");
  window.location.href = getPagesPrefix() + 'login.html';
}

// Redirect to login if not authenticated; optionally restrict by role
function guardPage(allowedRoles) {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = getPagesPrefix() + 'login.html';
    return false;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to correct role page
    redirectByRole(user.role);
    return false;
  }
  return true;
}

function redirectByRole(role) {
  window.location.href = getPagesPrefix() + 'dashboard.html';
}
