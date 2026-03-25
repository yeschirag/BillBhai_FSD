// state.js — Page State Management

function setPage(name) {
  localStorage.setItem('page', name);
}

function getPage() {
  return localStorage.getItem('page') || 'dashboard';
}

function navigateTo(href) {
  const pageName = href.replace('.html', '').split('/').pop();
  setPage(pageName);
  window.location.href = href;
}
