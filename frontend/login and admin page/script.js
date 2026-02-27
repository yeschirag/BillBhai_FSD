document.addEventListener('DOMContentLoaded', () => {
    function updateLogos() {
        const isLight = document.body.classList.contains('light-mode');
        const loginLogo = document.querySelector('.brand-logo-img');
        if (loginLogo) loginLogo.src = isLight ? 'logo.png' : 'logo-dark.png';
    }

    const subtitleEl = document.getElementById('brandSubtitle');
    const text = 'ORDER & BILLING SYSTEM';
    let ci = 0;
    function typeText() {
        if (ci <= text.length) { subtitleEl.textContent = text.substring(0, ci); ci++; setTimeout(typeText, 60 + Math.random() * 40); }
    }
    setTimeout(typeText, 600);

    const card = document.getElementById('loginCard');
    card.addEventListener('mousemove', e => {
        const r = card.getBoundingClientRect();
        const rx = ((e.clientY - r.top - r.height / 2) / (r.height / 2)) * -3;
        const ry = ((e.clientX - r.left - r.width / 2) / (r.width / 2)) * 3;
        card.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    });
    card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
        card.style.transition = 'transform 0.5s ease';
        setTimeout(() => { card.style.transition = ''; }, 500);
    });

    const toggleBtn = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    toggleBtn.addEventListener('click', () => {
        const isP = passwordInput.type === 'password';
        passwordInput.type = isP ? 'text' : 'password';
        toggleBtn.classList.toggle('showing', isP);
    });

    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const btnLogin = document.getElementById('btnLogin');

    loginForm.addEventListener('submit', e => {
        e.preventDefault();
        document.querySelectorAll('.input-group').forEach(g => g.classList.remove('error', 'shake'));
        const u = usernameInput.value.trim(), p = passwordInput.value.trim();
        let err = false;
        if (!u) { const g = document.getElementById('usernameGroup'); g.classList.add('error', 'shake'); g.addEventListener('animationend', () => g.classList.remove('shake'), { once: true }); err = true; }
        if (!p) { const g = document.getElementById('passwordGroup'); g.classList.add('error', 'shake'); g.addEventListener('animationend', () => g.classList.remove('shake'), { once: true }); err = true; }
        if (err) return;
        btnLogin.classList.add('loading'); btnLogin.disabled = true;
        setTimeout(() => {
            btnLogin.classList.remove('loading'); btnLogin.classList.add('success');
            setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
        }, 1800);
    });

    document.querySelectorAll('.input-group input').forEach(input => {
        input.addEventListener('focus', () => input.closest('.input-group').classList.remove('error'));
    });

    const themeToggle = document.getElementById('theme-toggle');
    if (localStorage.getItem('billbhai-theme') === 'light') {
        document.body.classList.add('light-mode');
    }
    updateLogos();

    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        localStorage.setItem('billbhai-theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
        updateLogos();
    });
});
