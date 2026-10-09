// Presentation only: the feature handlers and run reporting live in actions.js.
const panels = Array.from(document.querySelectorAll('[data-panel]'));
const navigation = Array.from(document.querySelectorAll('[data-panel-target]'));
const search = document.getElementById('scenarioSearch');
const title = document.getElementById('activeTitle');
const description = document.getElementById('activeDescription');
let activePanel = 'read';
const searchable = new Map(Array.from(document.querySelectorAll('[data-scenario]')).map(card => [
    card,
    (card.querySelector('.card-heading').textContent + ' ' +
        Array.from(card.querySelectorAll('[data-action]')).map(button => button.dataset.actionLabel).join(' ')).toLowerCase()
]));

function updateView() {
    const query = search.value.trim().toLowerCase();
    let visible = 0;
    let matchingPanels = 0;
    for (const panel of panels) {
        let matches = 0;
        for (const card of panel.querySelectorAll('[data-scenario]')) {
            const matched = !query || (panel.dataset.title.toLowerCase() + ' ' + searchable.get(card)).includes(query);
            card.hidden = !matched;
            if (matched) matches++;
        }
        panel.hidden = query ? matches === 0 : panel.dataset.panel !== activePanel;
        if (!panel.hidden) {
            visible += matches;
            matchingPanels++;
        }
    }
    document.getElementById('scenarioCount').textContent = visible + (visible === 1 ? ' scenario' : ' scenarios');
    document.getElementById('searchEmpty').hidden = visible > 0;
    const current = panels.find(panel => panel.dataset.panel === activePanel);
    title.textContent = query ? 'Search results' : current.dataset.title;
    description.textContent = query ? `${visible} scenarios across ${matchingPanels} feature groups. Clear the search to return to your panel.` : current.dataset.description;
    for (const button of navigation) {
        if (!query && button.dataset.panelTarget === activePanel)
            button.setAttribute('aria-current', 'page');
        else
            button.removeAttribute('aria-current');
    }
}

function selectPanel(identifier, updateHash = true) {
    if (!panels.some(panel => panel.dataset.panel === identifier)) return;
    activePanel = identifier;
    search.value = '';
    updateView();
    if (updateHash) history.replaceState(null, '', '#' + identifier);
}

for (const button of navigation) {
    button.addEventListener('click', () => selectPanel(button.dataset.panelTarget));
}
search.addEventListener('input', updateView);
window.addEventListener('hashchange', () => selectPanel(location.hash.slice(1), false));

document.getElementById('quickCheck').addEventListener('click', () => {
    selectPanel('metadata');
    document.getElementById('jsonFromBox').click();
});
document.getElementById('openConnections').addEventListener('click', (event) => {
    event.preventDefault();
    const settings = document.getElementById('connectionSettings');
    settings.open = !settings.open;
    if (settings.open) document.getElementById('ksDicomwebBaseUrl').focus();
});

for (const input of document.querySelectorAll('input[type=file]')) {
    input.addEventListener('change', () => {
        const label = document.getElementById(input.id + 'Name');
        if (label) label.textContent = input.files[0]?.name || 'No file selected. Choose a file, then run an action.';
    });
}

// Saving writes/downloads remains an explicit action; editing controls never runs a feature.
selectPanel(location.hash.slice(1) || 'read', false);
