(function () {
    function normalizePath(pathname) {
        if (!pathname) {
            return '/index.html';
        }

        return pathname.endsWith('/') ? pathname + 'index.html' : pathname;
    }

    function setActiveNav() {
        var currentPath = normalizePath(window.location.pathname);
        var links = document.querySelectorAll('[data-nav-link]');
        var resolved = [];

        links.forEach(function (link) {
            var href = link.getAttribute('href');
            if (!href) {
                return;
            }

            var resolvedPath = '';
            try {
                resolvedPath = normalizePath(new URL(href, window.location.href).pathname);
            } catch (e) {
                return;
            }

            resolved.push({
                link: link,
                path: resolvedPath
            });
        });

        var hasExact = resolved.some(function (entry) {
            return entry.path === currentPath;
        });

        resolved.forEach(function (entry) {
            var link = entry.link;
            var resolvedPath = entry.path;
            var active = false;

            if (hasExact) {
                active = (resolvedPath === currentPath);
            } else if ((resolvedPath.endsWith('/index.html') === true)
                && (resolvedPath !== '/index.html')) {
                var sectionPath = resolvedPath.substring(0, resolvedPath.length - 'index.html'.length);
                active = (currentPath.startsWith(sectionPath) === true);
            }

            link.classList.toggle('active', active);
        });
    }

    function applyRevealDelays() {
        var items = document.querySelectorAll('.reveal');
        items.forEach(function (item, index) {
            item.style.setProperty('--delay', String(index * 36) + 'ms');
        });
    }

    function wireFilters() {
        var filters = document.querySelectorAll('[data-filter-input]');
        filters.forEach(function (input) {
            var listSelector = input.getAttribute('data-filter-target');
            if (!listSelector) {
                return;
            }

            var container = document.querySelector(listSelector);
            if (!container) {
                return;
            }

            var items = Array.prototype.slice.call(container.querySelectorAll('[data-filter-item]'));
            var groups = Array.prototype.slice.call(container.querySelectorAll('.domain-catalog'));

            function updateGroupVisibility() {
                if (groups.length === 0) {
                    return;
                }

                groups.forEach(function (group) {
                    var groupItems = Array.prototype.slice.call(group.querySelectorAll('[data-filter-item]'));
                    var anyVisible = groupItems.some(function (item) {
                        return item.style.display !== 'none';
                    });
                    group.style.display = anyVisible ? '' : 'none';
                });
            }

            input.addEventListener('input', function () {
                var query = String(input.value || '').trim().toLowerCase();
                items.forEach(function (item) {
                    var haystack = String(item.getAttribute('data-filter-item') || '').toLowerCase();
                    item.style.display = haystack.indexOf(query) !== -1 ? '' : 'none';
                });
                updateGroupVisibility();
            });

            updateGroupVisibility();
        });
    }

    function wireDocTabs() {
        var tabsets = document.querySelectorAll('[data-tabset]');
        tabsets.forEach(function (tabset, tabsetIndex) {
            var buttons = Array.prototype.slice.call(tabset.querySelectorAll('[data-tab-button]'));
            var panels = Array.prototype.slice.call(tabset.querySelectorAll('[data-tab-panel]'));

            if (buttons.length === 0 || panels.length === 0) {
                return;
            }

            var tablist = tabset.querySelector('.doc-tablist');
            if (tablist) {
                tablist.setAttribute('role', 'tablist');
            }

            var tabsetId = tabset.getAttribute('data-tabset-id');
            if (!tabsetId) {
                tabsetId = 'doc-tabset-' + String(tabsetIndex + 1);
                tabset.setAttribute('data-tabset-id', tabsetId);
            }

            function activate(key, withFocus) {
                buttons.forEach(function (button, buttonIndex) {
                    var buttonKey = String(button.getAttribute('data-tab-button') || '');
                    var isActive = buttonKey === key;
                    var buttonId = tabsetId + '-tab-' + String(buttonIndex + 1);
                    var panelId = tabsetId + '-panel-' + String(buttonIndex + 1);

                    button.id = buttonId;
                    button.setAttribute('role', 'tab');
                    button.setAttribute('aria-selected', isActive ? 'true' : 'false');
                    button.setAttribute('aria-controls', panelId);
                    button.setAttribute('tabindex', isActive ? '0' : '-1');
                    button.classList.toggle('active', isActive);

                    if (isActive && withFocus === true) {
                        button.focus();
                    }
                });

                panels.forEach(function (panel, panelIndex) {
                    var panelKey = String(panel.getAttribute('data-tab-panel') || '');
                    var isActive = panelKey === key;
                    var buttonId = tabsetId + '-tab-' + String(panelIndex + 1);
                    var panelId = tabsetId + '-panel-' + String(panelIndex + 1);

                    panel.id = panelId;
                    panel.setAttribute('role', 'tabpanel');
                    panel.setAttribute('aria-labelledby', buttonId);
                    panel.classList.toggle('active', isActive);
                    panel.hidden = !isActive;
                });
            }

            var activeKey = String(buttons[0].getAttribute('data-tab-button') || '');
            buttons.forEach(function (button) {
                if (button.classList.contains('active')) {
                    activeKey = String(button.getAttribute('data-tab-button') || activeKey);
                }
            });

            buttons.forEach(function (button, index) {
                button.addEventListener('click', function () {
                    activate(String(button.getAttribute('data-tab-button') || ''), false);
                });

                button.addEventListener('keydown', function (event) {
                    if (event.key !== 'ArrowLeft'
                        && event.key !== 'ArrowRight'
                        && event.key !== 'Home'
                        && event.key !== 'End') {
                        return;
                    }

                    event.preventDefault();

                    var nextIndex = index;
                    if (event.key === 'ArrowRight') {
                        nextIndex = (index + 1) % buttons.length;
                    } else if (event.key === 'ArrowLeft') {
                        nextIndex = (index - 1 + buttons.length) % buttons.length;
                    } else if (event.key === 'Home') {
                        nextIndex = 0;
                    } else if (event.key === 'End') {
                        nextIndex = buttons.length - 1;
                    }

                    activate(String(buttons[nextIndex].getAttribute('data-tab-button') || ''), true);
                });
            });

            activate(activeKey, false);
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        setActiveNav();
        applyRevealDelays();
        wireFilters();
        wireDocTabs();
        document.documentElement.classList.add('ready');
    });
})();
