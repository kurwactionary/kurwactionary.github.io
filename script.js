/* -----------------------------
           CONFIGURATION – change only this
           ----------------------------- */
        const GIST_RAW_URL = 'https://gist.githubusercontent.com/kurwactionary/92207b218aaa06edc45ca193bdbac840/raw/52e15cc9e219e04ff0e0127058bf3a1326a2cc5e/dictionary.json'
        
        /* -----------------------------
           STATE
           ----------------------------- */
        let wordsData = [];
        let currentWord = null;
        let searchTerm = '';

        /* -----------------------------
           LOAD DATA FROM GIST
           ----------------------------- */
        async function loadData() {
            const container = document.getElementById('treeContainer');
            container.innerHTML = '<div class="no-word">Loading…</div>';

            try {
                const res = await fetch(GIST_RAW_URL, { cache: 'no-cache' });
                if (!res.ok) throw new Error(res.status);
                wordsData = await res.json();
                renderTree();
            } catch (err) {
                console.error(err);
                container.innerHTML = '<div class="no-word">Error fetching data.</div>';
            }
        }

        /* -----------------------------
           TREE HELPERS (unchanged logic)
           ----------------------------- */
        function getChildren(parent) {
            return wordsData.filter(w => w.parent === parent);
        }

        function findWord(word) {
            return wordsData.find(w => w.word.toLowerCase() === word.toLowerCase());
        }

        /* -----------------------------
           RENDERING
           ----------------------------- */
        function renderTree(focusWord = null) {
            const container = document.getElementById('treeContainer');
            container.innerHTML = '';

            if (searchTerm) {
                renderSearchResults(container, focusWord);
            } else {
                renderDefaultTree(container, 'root', 0);
            }
        }

        function renderSearchResults(container, focusWord) {
            const matches = wordsData
                .filter(w => w.word.toLowerCase().includes(searchTerm))
                .sort((a, b) => {
                    const aStart = a.word.toLowerCase().startsWith(searchTerm);
                    const bStart = b.word.toLowerCase().startsWith(searchTerm);
                    if (aStart && !bStart) return -1;
                    if (!aStart && bStart) return 1;
                    return a.word.localeCompare(b.word);
                });

            if (!matches.length) {
                container.innerHTML = '<div class="no-word">No results</div>';
                return;
            }

            const byParent = {};
            matches.forEach(w => {
                (byParent[w.parent] ||= []).push(w);
            });

            Object.entries(byParent).forEach(([parent, children]) => {
                const parentObj = findWord(parent) || { word: parent };
                const pDiv = createWordElement(parentObj, parent === focusWord);
                container.appendChild(pDiv);

                const level = document.createElement('div');
                level.className = 'level';
                children.forEach(c => level.appendChild(createWordElement(c, c.word === focusWord)));
                container.appendChild(level);
            });
        }

        function renderDefaultTree(container, parent, level) {
            const kids = getChildren(parent);
            if (!kids.length && level === 0) {
                container.innerHTML = '<div class="no-word">No data to display</div>';
                return;
            }

            kids.forEach(kid => {
                container.appendChild(createWordElement(kid, kid.word === currentWord));

                if (level < 2) {
                    const grand = getChildren(kid.word);
                    if (grand.length) {
                        const levelDiv = document.createElement('div');
                        levelDiv.className = 'level';
                        grand.forEach(g => levelDiv.appendChild(createWordElement(g, g.word === currentWord)));

                        if (level < 1) {
                            grand.forEach(g => {
                                const gg = getChildren(g.word);
                                if (gg.length) {
                                    const sub = document.createElement('div');
                                    sub.className = 'level';
                                    gg.slice(0, 3).forEach(ggChild =>
                                        sub.appendChild(createWordElement(ggChild, ggChild.word === currentWord))
                                    );
                                    if (gg.length > 3) {
                                        const more = document.createElement('div');
                                        more.className = 'word-node';
                                        more.textContent = `+${gg.length - 3} more…`;
                                        more.style.opacity = 0.5;
                                        sub.appendChild(more);
                                    }
                                    levelDiv.appendChild(sub);
                                }
                            });
                        }
                        container.appendChild(levelDiv);
                    }
                }
            });
        }

        function createWordElement(wordData, active = false) {
            const div = document.createElement('div');
            div.className = 'word-node' + (active ? ' active' : '');
            div.textContent = wordData.word;
            div.dataset.word = wordData.word;

            if (searchTerm && !wordData.word.toLowerCase().startsWith(searchTerm))
                div.classList.add('hidden');

            div.addEventListener('click', () => selectWord(wordData.word));
            return div;
        }

        /* -----------------------------
           DEFINITION PANEL
           ----------------------------- */
        function selectWord(word) {
            currentWord = word;
            const w = findWord(word);
            if (!w) return;

            document.querySelectorAll('.word-node').forEach(n =>
                n.classList.toggle('active', n.dataset.word === word)
            );

            document.getElementById('definitionPanel').innerHTML = `
                <h2>${w.word}</h2>
                <p class="definition-text">${w.definition}</p>
                ${(w.tags || []).length
                    ? `<div class="tags-container">
                         ${w.tags.map(t => `<span class="tag">${t}</span>`).join('')}
                       </div>`
                    : ''}
                ${w.parent && w.parent !== 'root'
                    ? `<p>Parent: <a href="#" class="parent-link" data-parent="${w.parent}">${w.parent}</a></p>`
                    : ''}
            `;

            const parentLink = document.querySelector('.parent-link');
            if (parentLink) {
                parentLink.addEventListener('click', e => {
                    e.preventDefault();
                    selectWord(parentLink.dataset.parent);
                });
            }

            renderTree(word);
        }

        /* -----------------------------
           SEARCH INPUT
           ----------------------------- */
        document.getElementById('searchInput').addEventListener('input', e => {
            searchTerm = e.target.value.trim().toLowerCase();
            if (!searchTerm) {
                currentWord = null;
            }
            renderTree(currentWord);
            document.getElementById('definitionPanel').innerHTML = currentWord
                ? ''
                : `<h2>Select a word</h2><p class="definition-text">Click any word in the tree to see its definition.</p>`;
        });

        /* -----------------------------
           INITIAL LOAD
           ----------------------------- */
        loadData();