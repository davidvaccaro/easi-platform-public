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

        var bestSectionLength = -1;
        if (hasExact === false) {
            resolved.forEach(function (entry) {
                var resolvedPath = entry.path;
                if (resolvedPath.endsWith('/index.html') !== true) {
                    return;
                }

                var sectionPath = resolvedPath.substring(0, resolvedPath.length - 'index.html'.length);
                if (currentPath.startsWith(sectionPath) !== true) {
                    return;
                }

                if (sectionPath.length > bestSectionLength) {
                    bestSectionLength = sectionPath.length;
                }
            });
        }

        resolved.forEach(function (entry) {
            var link = entry.link;
            var resolvedPath = entry.path;
            var active = false;

            if (hasExact) {
                active = (resolvedPath === currentPath);
            } else if (bestSectionLength >= 0
                && (resolvedPath.endsWith('/index.html') === true)) {
                var sectionPath = resolvedPath.substring(0, resolvedPath.length - 'index.html'.length);
                active = (currentPath.startsWith(sectionPath) === true)
                    && (sectionPath.length === bestSectionLength);
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

    function wireTableSorters() {
        var buttons = Array.prototype.slice.call(
            document.querySelectorAll('[data-sort-target][data-sort-col]')
        );

        if (buttons.length === 0) {
            return;
        }

        function readCellValue(row, columnIndex) {
            if (!row || !row.cells || row.cells.length <= columnIndex) {
                return '';
            }

            return String(row.cells[columnIndex].textContent || '').replace(/\s+/g, ' ').trim();
        }

        function setButtonState(button, direction) {
            if (!button) {
                return;
            }

            if (direction === 'asc' || direction === 'desc') {
                button.setAttribute('data-sort-dir', direction);
                button.classList.add('active');
                button.setAttribute('aria-pressed', 'true');
            } else {
                button.removeAttribute('data-sort-dir');
                button.classList.remove('active');
                button.setAttribute('aria-pressed', 'false');
            }
        }

        buttons.forEach(function (button) {
            button.setAttribute('aria-pressed', 'false');

            button.addEventListener('click', function () {
                var targetSelector = String(button.getAttribute('data-sort-target') || '');
                if (targetSelector.length === 0) {
                    return;
                }

                var body = document.querySelector(targetSelector);
                if (!body) {
                    return;
                }

                var parsedColumn = Number(button.getAttribute('data-sort-col'));
                var columnIndex = Number.isFinite(parsedColumn) ? Math.max(0, parsedColumn - 1) : 0;
                var rows = Array.prototype.slice.call(body.querySelectorAll(':scope > tr'));
                if (rows.length <= 1) {
                    return;
                }

                var nextDirection = (button.getAttribute('data-sort-dir') === 'asc') ? 'desc' : 'asc';

                buttons.forEach(function (candidate) {
                    if (candidate === button) {
                        return;
                    }

                    if (String(candidate.getAttribute('data-sort-target') || '') !== targetSelector) {
                        return;
                    }

                    setButtonState(candidate, null);
                });

                var decorated = rows.map(function (row, index) {
                    return {
                        row: row,
                        index: index,
                        value: readCellValue(row, columnIndex)
                    };
                });

                decorated.sort(function (left, right) {
                    var compare = left.value.localeCompare(right.value, undefined, {
                        sensitivity: 'base',
                        numeric: true
                    });

                    if (compare === 0) {
                        compare = left.index - right.index;
                    }

                    return nextDirection === 'asc' ? compare : -compare;
                });

                decorated.forEach(function (entry) {
                    body.appendChild(entry.row);
                });

                setButtonState(button, nextDirection);

                if (typeof window.__refreshExpandableSections === 'function') {
                    window.__refreshExpandableSections();
                }
            });
        });
    }

    function wireApiLanguageView() {
        var switchers = document.querySelectorAll('[data-api-language-switcher]');
        if (!switchers || switchers.length === 0) {
            return;
        }

        var storageKey = 'easi-api-language-view';
        var supported = ['neutral', 'javascript', 'csharp', 'java', 'python'];
        var buttons = Array.prototype.slice.call(document.querySelectorAll('[data-api-language]'));
        var languageNodes = Array.prototype.slice.call(document.querySelectorAll('[data-lang-source]'));

        function isSupportedLanguage(value) {
            return supported.indexOf(String(value || '')) !== -1;
        }

        function getStoredLanguage() {
            try {
                var stored = window.localStorage.getItem(storageKey);
                return isSupportedLanguage(stored) ? stored : null;
            } catch (e) {
                return null;
            }
        }

        function setStoredLanguage(value) {
            try {
                window.localStorage.setItem(storageKey, String(value || 'neutral'));
            } catch (e) {
                return;
            }
        }

        function splitWords(value) {
            var text = String(value || '').trim();
            if (text.length === 0) {
                return [];
            }

            var spaced = text
                .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
                .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
                .replace(/[_\-\s]+/g, ' ')
                .trim();

            if (spaced.length === 0) {
                return [];
            }

            return spaced.split(/\s+/).map(function (item) {
                return item.toLowerCase();
            });
        }

        function toPascalCase(value) {
            var words = splitWords(value);
            if (words.length === 0) {
                return String(value || '');
            }

            return words.map(function (word) {
                if (word.length === 0) {
                    return '';
                }
                return word.charAt(0).toUpperCase() + word.slice(1);
            }).join('');
        }

        function toCamelCase(value) {
            var pascal = toPascalCase(value);
            if (pascal.length === 0) {
                return String(value || '');
            }
            return pascal.charAt(0).toLowerCase() + pascal.slice(1);
        }

        function toSnakeCase(value) {
            var words = splitWords(value);
            if (words.length === 0) {
                return String(value || '');
            }
            return words.join('_');
        }

        function transformIdentifier(value, language, kind) {
            var text = String(value || '');
            if (text.length === 0) {
                return text;
            }

            if (language === 'javascript') {
                return toCamelCase(text);
            }

            if (language === 'python') {
                return toSnakeCase(text);
            }

            if (language === 'csharp') {
                if (kind === 'parameter-name') {
                    return toCamelCase(text);
                }
                return toPascalCase(text);
            }

            if (language === 'java') {
                return toCamelCase(text);
            }

            return text;
        }

        function transformSignature(value, language) {
            var text = String(value || '').trim();
            if (text.length === 0) {
                return text;
            }

            var match = text.match(/^([^()]+)\((.*)\)$/);
            if (match == null) {
                return transformIdentifier(text, language, 'member-name');
            }

            var memberName = String(match[1] || '').trim();
            var paramsRaw = String(match[2] || '').trim();
            var translatedMemberName = transformIdentifier(memberName, language, 'member-name');

            if (paramsRaw.length === 0) {
                return translatedMemberName + '()';
            }

            var translatedParams = paramsRaw.split(',').map(function (entry) {
                var token = String(entry || '').trim();
                if (token.length === 0) {
                    return token;
                }

                var restPrefix = '';
                if (token.indexOf('...') === 0) {
                    restPrefix = '...';
                    token = token.slice(3);
                }

                var optionalSuffix = '';
                if (token.endsWith('?')) {
                    optionalSuffix = '?';
                    token = token.slice(0, -1);
                }

                return restPrefix + transformIdentifier(token, language, 'parameter-name') + optionalSuffix;
            });

            return translatedMemberName + '(' + translatedParams.join(', ') + ')';
        }

        function transformTypeToken(value, language) {
            var token = String(value || '');
            if (token.length === 0) {
                return token;
            }

            var byLanguage = {
                neutral: {
                    string: 'String',
                    number: 'Number',
                    boolean: 'Boolean',
                    object: 'Object',
                    Function: 'Function',
                    Array: 'List',
                    ReadonlyArray: 'List',
                    Map: 'Map',
                    Promise: 'Future',
                    Uint8Array: 'Bytes',
                    ArrayBuffer: 'Bytes',
                    DataView: 'ByteView',
                    ReadableStream: 'Stream',
                    ReadableStreamDefaultReader: 'StreamReader',
                    Response: 'Response',
                    Headers: 'Headers',
                    null: 'null',
                    undefined: 'null',
                    unknown: 'Value'
                },
                javascript: {
                    string: 'string',
                    number: 'number',
                    boolean: 'boolean',
                    object: 'object',
                    Function: 'Function',
                    Array: 'Array',
                    ReadonlyArray: 'Array',
                    Map: 'Map',
                    Promise: 'Promise',
                    Uint8Array: 'Uint8Array',
                    ArrayBuffer: 'ArrayBuffer',
                    DataView: 'DataView',
                    ReadableStream: 'ReadableStream',
                    ReadableStreamDefaultReader: 'ReadableStreamDefaultReader',
                    Response: 'Response',
                    Headers: 'Headers',
                    null: 'null',
                    undefined: 'undefined',
                    unknown: 'unknown'
                },
                csharp: {
                    string: 'string',
                    number: 'double',
                    boolean: 'bool',
                    object: 'object',
                    Function: 'Delegate',
                    Array: 'IReadOnlyList',
                    ReadonlyArray: 'IReadOnlyList',
                    Map: 'IDictionary',
                    Promise: 'Task',
                    Uint8Array: 'byte[]',
                    ArrayBuffer: 'byte[]',
                    DataView: 'ReadOnlySpan<byte>',
                    ReadableStream: 'Stream',
                    ReadableStreamDefaultReader: 'Stream',
                    Response: 'HttpResponseMessage',
                    Headers: 'HttpHeaders',
                    null: 'null',
                    undefined: 'null',
                    unknown: 'object'
                },
                java: {
                    string: 'String',
                    number: 'double',
                    boolean: 'boolean',
                    object: 'Object',
                    Function: 'Function',
                    Array: 'List',
                    ReadonlyArray: 'List',
                    Map: 'Map',
                    Promise: 'CompletableFuture',
                    Uint8Array: 'byte[]',
                    ArrayBuffer: 'ByteBuffer',
                    DataView: 'ByteBuffer',
                    ReadableStream: 'InputStream',
                    ReadableStreamDefaultReader: 'InputStream',
                    Response: 'HttpResponse',
                    Headers: 'HttpHeaders',
                    null: 'null',
                    undefined: 'null',
                    unknown: 'Object'
                },
                python: {
                    string: 'str',
                    number: 'float',
                    boolean: 'bool',
                    object: 'dict',
                    Function: 'Callable',
                    Array: 'list',
                    ReadonlyArray: 'list',
                    Map: 'dict',
                    Promise: 'Awaitable',
                    Uint8Array: 'bytes',
                    ArrayBuffer: 'bytes',
                    DataView: 'memoryview',
                    ReadableStream: 'BinaryIO',
                    ReadableStreamDefaultReader: 'Iterator',
                    Response: 'Response',
                    Headers: 'Mapping',
                    null: 'None',
                    undefined: 'None',
                    unknown: 'Any'
                }
            };

            var dictionary = byLanguage[language];
            if (!dictionary) {
                return token;
            }

            var replaced = token.replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/g, function (identifier) {
                if (Object.prototype.hasOwnProperty.call(dictionary, identifier)) {
                    return dictionary[identifier];
                }
                return identifier;
            });

            if (language === 'python') {
                replaced = replaced.replace(/</g, '[').replace(/>/g, ']');
            }

            return replaced;
        }

        function translateToken(source, kind, language) {
            var text = String(source || '');
            if (language === 'neutral') {
                if (kind === 'type-token') {
                    return transformTypeToken(text, language);
                }
                return text;
            }

            if (language === 'javascript') {
                if (kind === 'member-name' || kind === 'property-name' || kind === 'parameter-name') {
                    return transformIdentifier(text, language, kind);
                }

                if (kind === 'signature') {
                    return transformSignature(text, language);
                }

                if (kind === 'type-token') {
                    return transformTypeToken(text, language);
                }

                return text;
            }

            if (kind === 'member-name' || kind === 'property-name' || kind === 'parameter-name') {
                return transformIdentifier(text, language, kind);
            }

            if (kind === 'signature') {
                return transformSignature(text, language);
            }

            if (kind === 'type-token') {
                return transformTypeToken(text, language);
            }

            return text;
        }

        function dedupeLineSeparatedTypeCells() {
            var containers = Array.prototype.slice.call(
                document.querySelectorAll('td.member-param-type, #option-contracts tbody td:nth-child(2)')
            );

            function dedupeContainer(container) {
                if (!container || !container.querySelector('br')) {
                    return;
                }

                var nodes = Array.prototype.slice.call(container.childNodes);
                if (nodes.length === 0) {
                    return;
                }

                var segments = [];
                var current = [];

                function pushCurrent() {
                    if (current.length > 0) {
                        segments.push(current);
                    }
                    current = [];
                }

                nodes.forEach(function (node) {
                    if ((node.nodeType === 1) && (node.tagName === 'BR')) {
                        pushCurrent();
                        return;
                    }
                    current.push(node);
                });
                pushCurrent();

                if (segments.length <= 1) {
                    return;
                }

                var seen = new Set();
                var kept = [];

                segments.forEach(function (segment) {
                    var text = segment.map(function (node) {
                        return String(node.textContent || '');
                    }).join('').replace(/\s+/g, ' ').trim().toLowerCase();

                    if (text.length === 0) {
                        return;
                    }

                    if (seen.has(text)) {
                        return;
                    }

                    seen.add(text);
                    kept.push(segment);
                });

                if (kept.length === segments.length) {
                    return;
                }

                while (container.firstChild) {
                    container.removeChild(container.firstChild);
                }

                kept.forEach(function (segment, index) {
                    if (index > 0) {
                        container.appendChild(document.createElement('br'));
                    }

                    segment.forEach(function (node) {
                        container.appendChild(node);
                    });
                });
            }

            containers.forEach(dedupeContainer);
        }

        function applyLanguage(language) {
            var targetLanguage = isSupportedLanguage(language) ? language : 'neutral';

            document.documentElement.setAttribute('data-api-language', targetLanguage);

            buttons.forEach(function (button) {
                var active = String(button.getAttribute('data-api-language') || '') === targetLanguage;
                button.classList.toggle('active', active);
                button.setAttribute('aria-selected', active ? 'true' : 'false');
            });

            languageNodes.forEach(function (node) {
                var source = String(node.getAttribute('data-lang-source') || '');
                var kind = String(node.getAttribute('data-lang-kind') || 'literal');
                node.textContent = translateToken(source, kind, targetLanguage);
            });

            dedupeLineSeparatedTypeCells();

            setStoredLanguage(targetLanguage);

            if (typeof window.__refreshExpandableSections === 'function') {
                window.__refreshExpandableSections();
            }
        }

        buttons.forEach(function (button) {
            button.addEventListener('click', function () {
                applyLanguage(String(button.getAttribute('data-api-language') || 'neutral'));
            });
        });

        applyLanguage(getStoredLanguage() || 'neutral');
    }

    function wireWhyEasiSyntaxHighlight() {
        var currentPath = normalizePath(window.location.pathname);
        var isOverview = currentPath.endsWith('/index.html') || currentPath === '/';
        var isWhyEasi = currentPath.endsWith('/why-easi.html') || currentPath.endsWith('/why-easi');
        var isWhyExpressive = currentPath.endsWith('/why-expressive.html') || currentPath.endsWith('/why-expressive');
        var isCorePipeline = currentPath.endsWith('/core-pipeline.html') || currentPath.endsWith('/core-pipeline');
        var isPipelineReader = currentPath.endsWith('/pipeline-reader.html') || currentPath.endsWith('/pipeline-reader');
        var isPipelineParser = currentPath.endsWith('/pipeline-parser.html') || currentPath.endsWith('/pipeline-parser');
        var isPipelineMappings = currentPath.endsWith('/pipeline-mappings.html') || currentPath.endsWith('/pipeline-mappings');
        var isPipelineSelection = currentPath.endsWith('/pipeline-selection.html') || currentPath.endsWith('/pipeline-selection');
        var isPipelineFiltering = currentPath.endsWith('/pipeline-filtering.html') || currentPath.endsWith('/pipeline-filtering');
        var isPipelineTerminal = currentPath.endsWith('/pipeline-terminal.html') || currentPath.endsWith('/pipeline-terminal');
        var isPipelineWriting = currentPath.endsWith('/pipeline-writing.html') || currentPath.endsWith('/pipeline-writing');
        var isPipelineResults = currentPath.endsWith('/pipeline-results.html') || currentPath.endsWith('/pipeline-results');
        if (
            !isOverview
            && !isWhyEasi
            && !isWhyExpressive
            && !isCorePipeline
            && !isPipelineReader
            && !isPipelineParser
            && !isPipelineMappings
            && !isPipelineSelection
            && !isPipelineFiltering
            && !isPipelineTerminal
            && !isPipelineWriting
            && !isPipelineResults
        ) {
            return;
        }

        var blocks = Array.prototype.slice.call(
            document.querySelectorAll('pre > code[class*="language-"]')
        );

        if (blocks.length === 0) {
            return;
        }

        function escapeHtml(value) {
            return String(value || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        }

        function escapeHtmlWithAllowedCommentMarkup(value) {
            return escapeHtml(value)
                .replace(/&lt;strong&gt;/gi, '<strong>')
                .replace(/&lt;\/strong&gt;/gi, '</strong>');
        }

        function wrapToken(className, value, options) {
            var tokenValue = (options && options.allowCommentMarkup === true)
                ? escapeHtmlWithAllowedCommentMarkup(value)
                : escapeHtml(value);
            return '<span class="code-token ' + className + '">' + tokenValue + '</span>';
        }

        function extractSourcePreservingCommentMarkup(codeElement) {
            var html = String(codeElement.innerHTML || '');
            if (html.length === 0) {
                return String(codeElement.textContent || '');
            }

            var openToken = '__EASI_STRONG_OPEN__';
            var closeToken = '__EASI_STRONG_CLOSE__';
            var normalizedHtml = html
                .replace(/<\s*strong\s*>/gi, openToken)
                .replace(/<\s*\/\s*strong\s*>/gi, closeToken);

            var container = document.createElement('div');
            container.innerHTML = normalizedHtml;

            return String(container.textContent || '')
                .split(openToken).join('<strong>')
                .split(closeToken).join('</strong>');
        }

        function detectLanguage(codeElement) {
            var className = String(codeElement.className || '');
            var match = className.match(/\blanguage-([a-z0-9_-]+)\b/i);
            if (match == null) {
                return 'text';
            }

            var normalized = String(match[1] || '').toLowerCase();
            if (normalized === 'js') {
                return 'javascript';
            }
            if (normalized === 'cs') {
                return 'csharp';
            }
            return normalized;
        }

        function languageProfile(language) {
            var fallbackKeywords = [
                'if', 'else', 'for', 'while', 'return', 'class', 'new',
                'await', 'async', 'true', 'false', 'null'
            ];

            var profiles = {
                text: {
                    lineSlashComments: true,
                    lineHashComments: false,
                    blockComments: true,
                    allowBacktick: false,
                    allowTripleQuotes: false,
                    keywords: [
                        'if', 'fail', 'run', 'build', 'process',
                        'from', 'of', 'with', 'to', 'into'
                    ],
                    literals: ['true', 'false', 'null']
                },
                javascript: {
                    lineSlashComments: true,
                    lineHashComments: false,
                    blockComments: true,
                    allowBacktick: true,
                    allowTripleQuotes: false,
                    keywords: [
                        'const', 'let', 'var', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default',
                        'break', 'continue', 'return', 'new', 'class', 'extends', 'import', 'from', 'export',
                        'try', 'catch', 'finally', 'throw', 'await', 'async', 'function', 'typeof', 'instanceof'
                    ],
                    literals: ['true', 'false', 'null', 'undefined']
                },
                csharp: {
                    lineSlashComments: true,
                    lineHashComments: false,
                    blockComments: true,
                    allowBacktick: false,
                    allowTripleQuotes: false,
                    keywords: [
                        'var', 'new', 'if', 'else', 'for', 'foreach', 'while', 'switch', 'case',
                        'break', 'continue', 'return', 'class', 'public', 'private', 'protected',
                        'internal', 'static', 'void', 'using', 'namespace', 'try', 'catch', 'finally',
                        'throw', 'await', 'async'
                    ],
                    literals: ['true', 'false', 'null']
                },
                java: {
                    lineSlashComments: true,
                    lineHashComments: false,
                    blockComments: true,
                    allowBacktick: false,
                    allowTripleQuotes: false,
                    keywords: [
                        'var', 'new', 'if', 'else', 'for', 'while', 'switch', 'case',
                        'break', 'continue', 'return', 'class', 'public', 'private', 'protected',
                        'static', 'void', 'import', 'package', 'try', 'catch', 'finally',
                        'throw', 'extends', 'implements'
                    ],
                    literals: ['true', 'false', 'null']
                },
                python: {
                    lineSlashComments: false,
                    lineHashComments: true,
                    blockComments: false,
                    allowBacktick: false,
                    allowTripleQuotes: true,
                    keywords: [
                        'def', 'class', 'if', 'elif', 'else', 'for', 'while',
                        'return', 'import', 'from', 'as', 'with', 'try', 'except',
                        'finally', 'raise', 'await', 'async', 'lambda', 'pass'
                    ],
                    literals: ['true', 'false', 'none']
                },
                json: {
                    lineSlashComments: false,
                    lineHashComments: false,
                    blockComments: false,
                    allowBacktick: false,
                    allowTripleQuotes: false,
                    keywords: [],
                    literals: ['true', 'false', 'null']
                }
            };

            var profile = profiles[language];
            if (!profile) {
                profile = {
                    lineSlashComments: true,
                    lineHashComments: false,
                    blockComments: true,
                    allowBacktick: false,
                    allowTripleQuotes: false,
                    keywords: fallbackKeywords,
                    literals: ['true', 'false', 'null']
                };
            }

            profile.keywordSet = new Set((profile.keywords || []).map(function (value) {
                return String(value).toLowerCase();
            }));
            profile.literalSet = new Set((profile.literals || []).map(function (value) {
                return String(value).toLowerCase();
            }));
            return profile;
        }

        function isIdentifierStart(char) {
            return /[A-Za-z_]/.test(char);
        }

        function isIdentifierPart(char) {
            return /[A-Za-z0-9_]/.test(char);
        }

        function readNumber(text, startIndex) {
            var index = startIndex;
            if (text[index] === '0' && (text[index + 1] === 'x' || text[index + 1] === 'X')) {
                index += 2;
                while (index < text.length && /[0-9A-Fa-f]/.test(text[index])) {
                    index += 1;
                }
                return text.slice(startIndex, index);
            }

            while (index < text.length && /[0-9]/.test(text[index])) {
                index += 1;
            }

            if (text[index] === '.' && /[0-9]/.test(text[index + 1] || '')) {
                index += 1;
                while (index < text.length && /[0-9]/.test(text[index])) {
                    index += 1;
                }
            }

            return text.slice(startIndex, index);
        }

        function renderCodeChunk(chunk, profile) {
            var html = '';
            var index = 0;

            while (index < chunk.length) {
                var char = chunk[index];

                if (isIdentifierStart(char)) {
                    var start = index;
                    index += 1;
                    while (index < chunk.length && isIdentifierPart(chunk[index])) {
                        index += 1;
                    }

                    var token = chunk.slice(start, index);
                    var lower = token.toLowerCase();
                    var nextChar = (index < chunk.length) ? chunk[index] : '';
                    var prevChar = (start > 0) ? chunk[start - 1] : '';

                    if (profile.literalSet.has(lower)) {
                        html += wrapToken('code-token-literal', token);
                        continue;
                    }

                    if (profile.keywordSet.has(lower)) {
                        html += wrapToken('code-token-keyword', token);
                        continue;
                    }

                    if (nextChar === '(') {
                        html += wrapToken('code-token-function', token);
                        continue;
                    }

                    if (prevChar === '.') {
                        html += wrapToken('code-token-member', token);
                        continue;
                    }

                    if (/^[A-Z][A-Za-z0-9_]+$/.test(token)) {
                        html += wrapToken('code-token-type', token);
                        continue;
                    }

                    html += escapeHtml(token);
                    continue;
                }

                if (/[0-9]/.test(char)) {
                    var numberToken = readNumber(chunk, index);
                    html += wrapToken('code-token-number', numberToken);
                    index += numberToken.length;
                    continue;
                }

                html += escapeHtml(char);
                index += 1;
            }

            return html;
        }

        function startsWithAt(text, value, index) {
            return text.slice(index, index + value.length) === value;
        }

        function highlightSource(text, language) {
            var profile = languageProfile(language);
            var output = '';
            var index = 0;

            function emitComment(from, to) {
                output += wrapToken('code-token-comment', text.slice(from, to), {
                    allowCommentMarkup: true
                });
            }

            function emitString(from, to) {
                output += wrapToken('code-token-string', text.slice(from, to));
            }

            function emitChunk(from, to) {
                if (to <= from) {
                    return;
                }
                output += renderCodeChunk(text.slice(from, to), profile);
            }

            function isTokenBoundary(position) {
                var char = text[position];
                if (!char) {
                    return false;
                }

                if (profile.blockComments && char === '/' && text[position + 1] === '*') {
                    return true;
                }

                if (profile.lineSlashComments && char === '/' && text[position + 1] === '/') {
                    return true;
                }

                if (profile.lineHashComments && char === '#') {
                    return true;
                }

                if (profile.allowTripleQuotes && startsWithAt(text, "'''", position)) {
                    return true;
                }

                if (profile.allowTripleQuotes && startsWithAt(text, '"""', position)) {
                    return true;
                }

                if (char === '\'' || char === '"' || (profile.allowBacktick && char === '`')) {
                    return true;
                }

                return false;
            }

            while (index < text.length) {
                if (profile.blockComments && text[index] === '/' && text[index + 1] === '*') {
                    var blockEnd = text.indexOf('*/', index + 2);
                    if (blockEnd < 0) {
                        blockEnd = text.length;
                    } else {
                        blockEnd += 2;
                    }
                    emitComment(index, blockEnd);
                    index = blockEnd;
                    continue;
                }

                if (profile.lineSlashComments && text[index] === '/' && text[index + 1] === '/') {
                    var slashLineEnd = text.indexOf('\n', index + 2);
                    if (slashLineEnd < 0) {
                        slashLineEnd = text.length;
                    }
                    emitComment(index, slashLineEnd);
                    index = slashLineEnd;
                    continue;
                }

                if (profile.lineHashComments && text[index] === '#') {
                    var hashLineEnd = text.indexOf('\n', index + 1);
                    if (hashLineEnd < 0) {
                        hashLineEnd = text.length;
                    }
                    emitComment(index, hashLineEnd);
                    index = hashLineEnd;
                    continue;
                }

                if (profile.allowTripleQuotes && startsWithAt(text, "'''", index)) {
                    var tripleSingleEnd = text.indexOf("'''", index + 3);
                    if (tripleSingleEnd < 0) {
                        tripleSingleEnd = text.length;
                    } else {
                        tripleSingleEnd += 3;
                    }
                    emitString(index, tripleSingleEnd);
                    index = tripleSingleEnd;
                    continue;
                }

                if (profile.allowTripleQuotes && startsWithAt(text, '"""', index)) {
                    var tripleDoubleEnd = text.indexOf('"""', index + 3);
                    if (tripleDoubleEnd < 0) {
                        tripleDoubleEnd = text.length;
                    } else {
                        tripleDoubleEnd += 3;
                    }
                    emitString(index, tripleDoubleEnd);
                    index = tripleDoubleEnd;
                    continue;
                }

                var delimiter = text[index];
                if (delimiter === '\'' || delimiter === '"' || (profile.allowBacktick && delimiter === '`')) {
                    var stringIndex = index + 1;
                    var allowMultiline = (delimiter === '`');

                    while (stringIndex < text.length) {
                        var current = text[stringIndex];
                        if (current === '\\') {
                            stringIndex += 2;
                            continue;
                        }

                        if (current === delimiter) {
                            stringIndex += 1;
                            break;
                        }

                        if (!allowMultiline && current === '\n') {
                            break;
                        }

                        stringIndex += 1;
                    }

                    emitString(index, stringIndex);
                    index = stringIndex;
                    continue;
                }

                var chunkStart = index;
                while (index < text.length && !isTokenBoundary(index)) {
                    index += 1;
                }
                emitChunk(chunkStart, index);
            }

            return output;
        }

        blocks.forEach(function (codeElement) {
            if (codeElement.getAttribute('data-syntax-highlighted') === 'true') {
                return;
            }

            var language = detectLanguage(codeElement);
            var source = extractSourcePreservingCommentMarkup(codeElement);
            codeElement.innerHTML = highlightSource(source, language);
            codeElement.classList.add('syntax-highlighted');
            codeElement.setAttribute('data-syntax-highlighted', 'true');
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

        function resolveExpandedTheme(target) {
            if (target == null) {
                return 'default';
            }

            if (target.closest('.callout.informative') != null) {
                return 'informative';
            }

            if (target.closest('.callout.normative') != null) {
                return 'normative';
            }

            return 'default';
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

            var expandedTheme = resolveExpandedTheme(source);
            if (expandedTheme === 'default') {
                modal.removeAttribute('data-theme');
            } else {
                modal.setAttribute('data-theme', expandedTheme);
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
        wireTableSorters();
        wireDocTabs();
        wireApiLanguageView();
        wireWhyEasiSyntaxHighlight();
        wireExpandableSections();
        document.documentElement.classList.add('ready');
    });
})();
