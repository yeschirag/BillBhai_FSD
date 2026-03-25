// state.js — Page State Management

function setPage(name) {
  localStorage.setItem('page', name);
}

function getPage() {
  return localStorage.getItem('page') || 'dashboard';
}

function resolvePagePath(pageFile) {
  const path = window.location.pathname.replace(/\\/g, '/');
  const inPagesDir = path.includes('/pages/');
  return (inPagesDir ? '' : 'pages/') + pageFile;
}

function navigateTo(href) {
  const pageName = href.replace('.html', '').split('/').pop();
  setPage(pageName);
  window.location.href = resolvePagePath(pageName + '.html');
}
