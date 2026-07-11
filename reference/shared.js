/* ===== CaseReady AI — Shared JavaScript ===== */

document.addEventListener('DOMContentLoaded', () => {
    initNavHighlighting();
    initTabSwitching();
    initPanelToggles();
    initTableRowNavigation();
});

/* ---------- Active Nav Highlighting ---------- */
function initNavHighlighting() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navMap = {
        'index.html': 'Command Centre',
        'case-detail.html': 'Command Centre',
        'action-centre.html': 'Action Centre',
        'slot-rescue.html': 'Slot Rescue',
        'audit-trail.html': 'Audit Trail',
    };
    const activeLabel = navMap[currentPage];
    if (!activeLabel) return;

    const navLinks = document.querySelectorAll('#side-nav a[data-nav]');
    navLinks.forEach(link => {
        const label = link.getAttribute('data-nav');
        if (label === activeLabel) {
            link.classList.add('text-primary', 'font-bold', 'border-r-2', 'border-primary', 'bg-surface-container-high');
            link.classList.remove('text-on-surface-variant');
            const icon = link.querySelector('.material-symbols-outlined');
            if (icon) icon.classList.add('icon-fill');
        } else {
            link.classList.remove('text-primary', 'font-bold', 'border-r-2', 'border-primary', 'bg-surface-container-high');
            link.classList.add('text-on-surface-variant');
        }
    });
}

/* ---------- Tab Switching ---------- */
function initTabSwitching() {
    document.querySelectorAll('[data-tab-group]').forEach(group => {
        const tabs = group.querySelectorAll('[data-tab]');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const groupName = group.getAttribute('data-tab-group');
                const targetId = tab.getAttribute('data-tab');

                // Update tab styles
                tabs.forEach(t => {
                    t.classList.remove('text-primary', 'border-b-2', 'border-primary');
                    t.classList.add('text-on-surface-variant');
                });
                tab.classList.add('text-primary', 'border-b-2', 'border-primary');
                tab.classList.remove('text-on-surface-variant');

                // Show/hide panels
                const panels = document.querySelectorAll(`[data-tab-panel="${groupName}"]`);
                panels.forEach(panel => {
                    if (panel.getAttribute('data-tab-id') === targetId) {
                        panel.classList.remove('hidden');
                    } else {
                        panel.classList.add('hidden');
                    }
                });
            });
        });
    });
}

/* ---------- Panel Toggles (Evidence, Review Comms) ---------- */
function initPanelToggles() {
    // Open panel buttons
    document.querySelectorAll('[data-open-panel]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const panelId = btn.getAttribute('data-open-panel');
            openPanel(panelId);
        });
    });

    // Close panel buttons
    document.querySelectorAll('[data-close-panel]').forEach(btn => {
        btn.addEventListener('click', () => {
            const panelId = btn.getAttribute('data-close-panel');
            closePanel(panelId);
        });
    });

    // Overlay click to close
    document.querySelectorAll('.panel-overlay').forEach(overlay => {
        overlay.addEventListener('click', () => {
            const panelId = overlay.getAttribute('data-overlay-for');
            closePanel(panelId);
        });
    });
}

function openPanel(panelId) {
    const panel = document.getElementById(panelId);
    const overlay = document.querySelector(`[data-overlay-for="${panelId}"]`);
    if (panel) panel.classList.add('open');
    if (overlay) overlay.classList.add('active');
}

function closePanel(panelId) {
    const panel = document.getElementById(panelId);
    const overlay = document.querySelector(`[data-overlay-for="${panelId}"]`);
    if (panel) panel.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
}

/* ---------- Table Row Navigation ---------- */
function initTableRowNavigation() {
    document.querySelectorAll('tr[data-href]').forEach(row => {
        row.style.cursor = 'pointer';
        row.addEventListener('click', () => {
            window.location.href = row.getAttribute('data-href');
        });
    });
}
