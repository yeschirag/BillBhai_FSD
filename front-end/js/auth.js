// auth.js — Authentication & Role Logic

const USERS = [
  // Superusers
  { username: "superuser", password: "super123",   role: "superuser", name: "Super User" },
  { username: "sarthak",   password: "sarthak123", role: "superuser", name: "Sarthak" },

  // Admins
  { username: "admin",     password: "admin123",   role: "admin", name: "Admin" },
  { username: "mohit",     password: "mohit123",   role: "admin", name: "Mohit" },
  { username: "aditya",    password: "aditya123",  role: "admin", name: "Aditya" },

  // Users
  { username: "chirag",    password: "chirag1234", role: "user", name: "Chirag" },
  { username: "satyam",    password: "satyam123",  role: "user", name: "Satyam" }
];

function login(username, password) {
  const user = USERS.find(u => u.username === username && u.password === password);
  if (user) {
    localStorage.setItem("currentUser", JSON.stringify(user));
    localStorage.setItem("page", user.role);
    return user;
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

function logout() {
  localStorage.removeItem("currentUser");
  localStorage.removeItem("page");
  // Determine redirect path based on depth
  const depth = window.location.pathname.split('/').filter(Boolean).length;
  const prefix = depth > 1 ? '../' : '';
  window.location.href = prefix + 'login.html';
}

// Redirect to login if not authenticated; optionally restrict by role
function guardPage(allowedRoles) {
  const user = getCurrentUser();
  if (!user) {
    const depth = window.location.pathname.split('/').filter(Boolean).length;
    const prefix = depth > 1 ? '../' : '';
    window.location.href = prefix + 'login.html';
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
  const depth = window.location.pathname.split('/').filter(Boolean).length;
  const prefix = depth > 1 ? '../' : '';
  window.location.href = prefix + 'dashboard.html';
}
