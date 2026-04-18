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

    function wireNavGroups() {
        var groups = document.querySelectorAll('[data-nav-group]');

        function setExpanded(group, toggle, expanded) {
            var next = (expanded === true);
            group.setAttribute('data-expanded', next ? 'true' : 'false');
            if (toggle) {
                toggle.setAttribute('aria-expanded', next ? 'true' : 'false');
            }
        }

        groups.forEach(function (group) {
            var toggle = group.querySelector('[data-nav-group-toggle]');
            var submenu = group.querySelector('[data-nav-submenu]');
            var root = group.querySelector('[data-nav-group-root]');

            if (!toggle || !submenu || !root) {
                return;
            }

            var hasActiveChild = (submenu.querySelector('.nav-link.active') != null);
            var rootActive = root.classList.contains('active');

            if (hasActiveChild === true) {
                root.classList.add('active');
                rootActive = true;
            }

            var preferredExpanded = (rootActive === true) || (hasActiveChild === true);
            var isExpanded = (group.getAttribute('data-expanded') === 'true');
            setExpanded(group, toggle, preferredExpanded || isExpanded);

            toggle.addEventListener('click', function () {
                var nextExpanded = !(group.getAttribute('data-expanded') === 'true');
                setExpanded(group, toggle, nextExpanded);
            });
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
                if (typeof window.__refreshExpandableSections === 'function') {
                    window.__refreshExpandableSections();
                }
            });

            updateGroupVisibility();
            if (typeof window.__refreshExpandableSections === 'function') {
                window.__refreshExpandableSections();
            }
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

                if (typeof window.__refreshExpandableSections === 'function') {
                    window.__refreshExpandableSections();
                }
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

    function wireExpandableSections() {
        var trackedTargets = [];
        var buttonByTarget = new WeakMap();
        var refreshScheduled = false;
        var modal = null;
        var modalBody = null;
        var modalTitle = null;
        var modalCloseButton = null;
        var activeTrigger = null;

        function isElementVisible(element) {
            if (!element || element.isConnected !== true) {
                return false;
            }

            if (element.offsetParent != null) {
                return true;
            }

            var style = window.getComputedStyle(element);
            return (style.display !== 'none')
                && (style.visibility !== 'hidden')
                && (style.position === 'fixed');
        }

        function hasScrollableOverflow(element) {
            var style = window.getComputedStyle(element);
            var canScrollX = (style.overflowX === 'auto') || (style.overflowX === 'scroll');
            var canScrollY = (style.overflowY === 'auto') || (style.overflowY === 'scroll');
            var overflowX = (element.scrollWidth - element.clientWidth) > 1;
            var overflowY = (element.scrollHeight - element.clientHeight) > 1;
            return (canScrollX && overflowX) || (canScrollY && overflowY);
        }

        function resolveExpandedTitle(target) {
            var section = target.closest('section');
            if (section != null) {
                var heading = section.querySelector('h2, h3, h4');
                if (heading && heading.textContent) {
                    var headingText = String(heading.textContent).trim();
                    if (headingText.length > 0) {
                        return headingText + ' (Expanded)';
                    }
                }
            }

            return 'Expanded Content';
        }

        function closeExpandedView() {
            if (!modal || modal.hasAttribute('hidden')) {
                return;
            }

            modal.setAttribute('hidden', '');
            document.documentElement.classList.remove('content-expand-open');

            if (modalBody) {
                modalBody.innerHTML = '';
            }

            if (activeTrigger && (typeof activeTrigger.focus === 'function')) {
                activeTrigger.focus();
            }
            activeTrigger = null;
        }

        function ensureModal() {
            if (modal != null) {
                return;
            }

            modal = document.createElement('div');
            modal.className = 'content-expand-modal';
            modal.setAttribute('hidden', '');
            modal.innerHTML = ''
                + '<button type="button" class="content-expand-modal__backdrop" data-content-expand-close aria-label="Close expanded content"></button>'
                + '<div class="content-expand-modal__dialog" role="dialog" aria-modal="true" aria-label="Expanded content">'
                + '  <div class="content-expand-modal__toolbar">'
                + '    <p class="content-expand-modal__title">Expanded Content</p>'
                + '    <button type="button" class="content-expand-modal__close" data-content-expand-close>Close</button>'
                + '  </div>'
                + '  <div class="content-expand-modal__body" data-content-expand-body></div>'
                + '</div>';
            document.body.appendChild(modal);

            modalBody = modal.querySelector('[data-content-expand-body]');
            modalTitle = modal.querySelector('.content-expand-modal__title');
            modalCloseButton = modal.querySelector('.content-expand-modal__close');

            modal.addEventListener('click', function (event) {
                var target = event.target;
                if ((target instanceof Element)
                    && (target.hasAttribute('data-content-expand-close'))) {
                    closeExpandedView();
                }
            });

            document.addEventListener('keydown', function (event) {
                if (event.key !== 'Escape') {
                    return;
                }

                if ((modal != null) && (modal.hasAttribute('hidden') === false)) {
                    event.preventDefault();
                    closeExpandedView();
                }
            });
        }

        function openExpandedView(source, trigger) {
            ensureModal();

            if (!modal || !modalBody) {
                return;
            }

            var clone = source.cloneNode(true);
            var nestedButtons = clone.querySelectorAll('.content-expand-trigger');
            nestedButtons.forEach(function (button) {
                button.remove();
            });

            modalBody.innerHTML = '';
            modalBody.appendChild(clone);
            modalBody.scrollTop = 0;
            modalBody.scrollLeft = 0;

            if (modalTitle) {
                modalTitle.textContent = resolveExpandedTitle(source);
            }

            activeTrigger = trigger || null;
            modal.removeAttribute('hidden');
            document.documentElement.classList.add('content-expand-open');

            if (modalCloseButton && (typeof modalCloseButton.focus === 'function')) {
                modalCloseButton.focus();
            }
        }

        function bindTarget(target) {
            if (buttonByTarget.has(target)) {
                return;
            }

            var shell = target.parentElement;
            if ((shell == null) || (shell.classList.contains('content-expand-shell') === false)) {
                shell = document.createElement('div');
                shell.className = 'content-expand-shell';
                target.parentNode.insertBefore(shell, target);
                shell.appendChild(target);
            }

            var button = document.createElement('button');
            button.type = 'button';
            button.className = 'content-expand-trigger';
            button.textContent = 'Expand';
            button.setAttribute('aria-label', 'Expand this section');
            button.hidden = true;
            button.addEventListener('click', function () {
                openExpandedView(target, button);
            });

            shell.appendChild(button);
            buttonByTarget.set(target, button);
            trackedTargets.push(target);
        }

        function collectTargets() {
            var targets = document.querySelectorAll('.page .table-scroll, .page .uml-diagram, .page .model-diagram, .page pre');
            targets.forEach(function (target) {
                bindTarget(target);
            });
        }

        function refreshExpandableSections() {
            collectTargets();

            trackedTargets = trackedTargets.filter(function (target) {
                if (!target || target.isConnected !== true) {
                    return false;
                }

                var button = buttonByTarget.get(target);
                if (!button || button.isConnected !== true) {
                    return false;
                }

                var expandable = isElementVisible(target) && hasScrollableOverflow(target);
                button.hidden = !expandable;
                return true;
            });
        }

        function scheduleRefresh() {
            if (refreshScheduled === true) {
                return;
            }
            refreshScheduled = true;
            window.requestAnimationFrame(function () {
                refreshScheduled = false;
                refreshExpandableSections();
            });
        }

        window.__refreshExpandableSections = scheduleRefresh;
        window.addEventListener('resize', scheduleRefresh);
        window.addEventListener('orientationchange', scheduleRefresh);

        scheduleRefresh();
    }

    document.addEventListener('DOMContentLoaded', function () {
        setActiveNav();
        wireNavGroups();
        applyRevealDelays();
        wireFilters();
        wireDocTabs();
        wireExpandableSections();
        document.documentElement.classList.add('ready');
    });
})();
