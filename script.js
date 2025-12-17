
(function() {
    'use strict';

    // --- CONFIGURATION ---
    const GIST_RAW_URL = 'https://gist.githubusercontent.com/kurwactionary/92207b218aaa06edc45ca193bdbac840/raw/52e15cc9e219e04ff0e0127058bf3a1326a2cc5e/dictionary.json';
    const SEARCH_DEBOUNCE_DELAY = 250;

    // --- STATE ---
    const state = {
        words: [],
        currentWord: null,
        searchTerm: ''
    };

    // --- DOM ELEMENTS ---
    const dom = {
        treeContainer: document.getElementById('treeContainer'),
        definitionPanel: document.getElementById('definitionPanel'),
        searchInput: document.getElementById('searchInput')
    };

    // --- UTILITIES ---
    const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    };

    // --- DATA ---
    async function loadData() {
        try {
            const response = await fetch(GIST_RAW_URL, { cache: 'no-cache' });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            state.words = await response.json();
            render();
        } catch (error) {
            console.error('Failed to load dictionary:', error);
            dom.treeContainer.innerHTML = '<div class="no-word">Error loading data. Please try again later.</div>';
        }
    }

    // --- LOGIC ---
    const getChildren = (parent) => state.words.filter(w => w.parent === parent);
    const findWord = (word) => state.words.find(w => w.word.toLowerCase() === word.toLowerCase());

    // --- RENDERING ---
    function render() {
        renderTree();
        renderDefinitionPanel();
    }

    function renderTree() {
        dom.treeContainer.innerHTML = ''; // Clear existing tree

        if (state.searchTerm) {
            const searchResults = state.words.filter(w => w.word.toLowerCase().includes(state.searchTerm));
            if (searchResults.length > 0) {
                searchResults.forEach(word => dom.treeContainer.appendChild(createWordElement(word)));
            } else {
                dom.treeContainer.innerHTML = '<div class="no-word">No results found.</div>';
            }
        } else {
            const rootWords = getChildren('root');
            if (rootWords.length > 0) {
                rootWords.forEach(word => dom.treeContainer.appendChild(createWordElement(word)));
            } else {
                dom.treeContainer.innerHTML = '<div class="no-word">No words to display.</div>';
            }
        }
    }

    function createWordElement(wordData) {
        const element = document.createElement('div');
        element.className = 'word-node';
        element.textContent = wordData.word;
        element.dataset.word = wordData.word;
        if (state.currentWord && wordData.word === state.currentWord.word) {
            element.classList.add('active');
        }
        return element;
    }

    function renderDefinitionPanel() {
        dom.definitionPanel.innerHTML = ''; // Clear existing content

        if (!state.currentWord) {
            const h2 = document.createElement('h2');
            h2.textContent = 'Select a word';
            const p = document.createElement('p');
            p.className = 'definition-text';
            p.textContent = 'Click any word in the tree to see its definition.';
            dom.definitionPanel.append(h2, p);
            return;
        }

        const { word, definition, tags, parent } = state.currentWord;

        const h2 = document.createElement('h2');
        h2.textContent = word;

        const p = document.createElement('p');
        p.className = 'definition-text';
        p.textContent = definition;

        dom.definitionPanel.append(h2, p);

        if (tags && tags.length > 0) {
            const tagsContainer = document.createElement('div');
            tagsContainer.className = 'tags-container';
            tags.forEach(tag => {
                const tagElement = document.createElement('span');
                tagElement.className = 'tag';
                tagElement.textContent = tag;
                tagsContainer.appendChild(tagElement);
            });
            dom.definitionPanel.appendChild(tagsContainer);
        }

        if (parent && parent !== 'root') {
            const parentP = document.createElement('p');
            parentP.innerHTML = 'Parent: ';
            const parentLink = document.createElement('a');
            parentLink.href = '#';
            parentLink.className = 'parent-link';
            parentLink.textContent = parent;
            parentLink.dataset.parent = parent;
            parentP.appendChild(parentLink);
            dom.definitionPanel.appendChild(parentP);
        }
    }


    // --- EVENT HANDLERS ---
    function handleTreeClick(event) {
        const target = event.target;
        if (target.classList.contains('word-node')) {
            const word = target.dataset.word;
            state.currentWord = findWord(word);
            render();
        } else if (target.classList.contains('parent-link')) {
            event.preventDefault();
            const parentWord = target.dataset.parent;
            state.currentWord = findWord(parentWord);
            render();
        }
    }

    const handleSearchInput = debounce(event => {
        state.searchTerm = event.target.value.trim().toLowerCase();
        renderTree();
    }, SEARCH_DEBOUNCE_DELAY);


    // --- INITIALIZATION ---
    function init() {
        dom.treeContainer.addEventListener('click', handleTreeClick);
        dom.searchInput.addEventListener('input', handleSearchInput);
        loadData();
    }

    init();

})();
