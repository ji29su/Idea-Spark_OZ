/**
 * IdeaSpark MVP Core Logic
 */

// --- State Management ---
let ideas = [];
let connections = [];
let groups = [];
let currentIdeaId = null;
let selectedIds = [];
let zoomLevel = 1;
let selectedKeyword = null;

const STORAGE_KEY = 'ideaspark_data';

// Initial Dummy Data
const dummyIdeas = [
    {
        id: '1',
        title: '친환경 패키지 구독 서비스',
        description: '제로 웨이스트를 지향하는 가구를 위한 정기 배송 패키지 서비스입니다. 생분해성 소재만을 사용하여 포장하며, 다회용기를 수거하는 시스템을 포함합니다.',
        author: '김현준',
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        position: { x: 150, y: 150 },
        tags: ['환경', '구독', '배송'],
        isAiGenerated: false,
        parentIdeaId: null,
        comments: [
            { id: 'c1', author: '이영희', content: '수거 시스템의 물류 비용을 어떻게 최적화할지 고민이 필요해 보이네요.', createdAt: new Date().toISOString() }
        ],
        attachments: [
            { id: 'a1', name: 'concept_v1.pdf', type: 'document' }
        ]
    },
    {
        id: '2',
        title: 'AI 기반 퍼스널 컬러 쇼핑 도우미',
        description: '사용자의 얼굴 사진을 분석하여 퍼스널 컬러를 진단하고, 이에 맞는 의류 및 화장품을 추천해주는 모바일 앱 아이디어입니다.',
        author: '박성은',
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
        position: { x: 500, y: 300 },
        tags: ['AI', '패션', '쇼핑'],
        isAiGenerated: false,
        parentIdeaId: null,
        comments: [],
        attachments: []
    },
    {
        id: '3',
        title: '[AI 추천] 로컬 기반 퍼스널 컬러 오프라인 팝업',
        description: '앱 사용자들이 실제로 제품을 테스트해볼 수 있는 오프라인 거점을 제안합니다. 동네 미용실이나 메이크업 샵과 연계할 수 있습니다.',
        author: 'IdeaSpark AI',
        createdAt: new Date().toISOString(),
        position: { x: 850, y: 350 },
        tags: ['AI', '오프라인', '팝업'],
        isAiGenerated: true,
        parentIdeaId: '2',
        comments: [],
        attachments: []
    }
];

// --- Initialization ---
function init() {
    loadData();
    renderAll();
    setupEventListeners();
}

function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        const data = JSON.parse(saved);
        if (Array.isArray(data)) {
            ideas = data;
            connections = [];
            groups = [];
        } else {
            ideas = data.ideas || [];
            connections = data.connections || [];
            groups = data.groups || [];
        }
    } else {
        ideas = dummyIdeas;
        connections = [];
        groups = [];
        saveData();
    }
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ideas, connections, groups }));
}

// --- Rendering ---
function renderAll() {
    renderList();
    renderBoard();
    renderConnections();
    renderGroups();
}

function renderList() {
    const listContainer = document.getElementById('idea-list');
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const sortBy = document.getElementById('sort-select').value;

    let filtered = ideas.filter(idea => 
        idea.title.toLowerCase().includes(searchTerm) || 
        idea.description.toLowerCase().includes(searchTerm)
    );

    // Sorting
    if (sortBy === 'newest') {
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortBy === 'comments') {
        filtered.sort((a, b) => b.comments.length - a.comments.length);
    } else if (sortBy === 'ai') {
        filtered.sort((a, b) => (b.isAiGenerated ? 1 : 0) - (a.isAiGenerated ? 1 : 0));
    }

    listContainer.innerHTML = filtered.map(idea => `
        <li class="idea-list__item ${currentIdeaId === idea.id ? 'idea-list__item--active' : ''}" data-id="${idea.id}">
            <div class="idea-list__title">${idea.title}</div>
            <div class="idea-list__desc">${idea.description}</div>
        </li>
    `).join('');

    // List Item Click
    listContainer.querySelectorAll('.idea-list__item').forEach(item => {
        item.addEventListener('click', () => {
            selectedIds = [item.dataset.id];
            openDetail(item.dataset.id);
        });
    });
}

function renderBoard() {
    const canvas = document.getElementById('board-cards');
    
    canvas.innerHTML = ideas.map(idea => {
        const isSelected = selectedIds.includes(idea.id);
        const hasKeyword = selectedKeyword && idea.tags && idea.tags.includes(selectedKeyword);
        const isMatch = hasKeyword;
        
        return `
            <div class="card ${idea.isAiGenerated ? 'card--ai' : ''} ${isSelected ? 'card--selected' : ''} ${isMatch ? 'card--highlight' : ''}" 
                 style="transform: translate(${idea.position.x}px, ${idea.position.y}px)"
                 data-id="${idea.id}">
                <span class="card__badge ${idea.isAiGenerated ? 'card__badge--ai' : 'card__badge--general'}">
                    ${idea.isAiGenerated ? 'AI Recommended' : 'Standard'}
                </span>
                <h3 class="card__title">${idea.title}</h3>
                <div class="keyword-list">
                    ${(idea.tags || []).map(tag => `<span class="keyword-tag ${selectedKeyword === tag ? 'keyword-tag--active' : ''}" data-tag="${tag}">${tag}</span>`).join('')}
                </div>
                <p class="card__desc">${idea.description}</p>
                <div class="card__footer">
                    ${idea.parentIdeaId || connections.some(c => c.parentId === idea.id || c.childId === idea.id) 
                        ? `<span class="card__rel">↔ Link</span>` : '<span>Idea</span>'}
                    <span>💬 ${idea.comments.length}</span>
                </div>
            </div>
        `;
    }).join('');

    // Card Interaction
    canvas.querySelectorAll('.card').forEach(card => {
        card.addEventListener('mousedown', startDragging);
        card.addEventListener('click', (e) => {
            if (card.dataset.isDragging === 'true') return;
            
            // Keyword Click
            if (e.target.classList.contains('keyword-tag')) {
                const tag = e.target.dataset.tag;
                selectedKeyword = selectedKeyword === tag ? null : tag;
                renderAll();
                return;
            }

            if (e.shiftKey) {
                if (selectedIds.includes(card.dataset.id)) {
                    selectedIds = selectedIds.filter(id => id !== card.dataset.id);
                } else {
                    selectedIds.push(card.dataset.id);
                }
                renderAll();
            } else {
                selectedIds = [card.dataset.id];
                openDetail(card.dataset.id);
            }
        });
    });
}

// --- Board Drag and Drop (Simple) ---
let draggedElement = null;
let offset = { x: 0, y: 0 };

function startDragging(e) {
    if (e.target.closest('.card__footer')) return; // Avoid drag on footer links
    
    draggedElement = e.currentTarget;
    draggedElement.dataset.isDragging = 'false';
    const rect = draggedElement.getBoundingClientRect();
    offset.x = e.clientX - rect.left;
    offset.y = e.clientY - rect.top;
    
    document.addEventListener('mousemove', onDragging);
    document.addEventListener('mouseup', stopDragging);
}

function onDragging(e) {
    if (!draggedElement) return;
    draggedElement.dataset.isDragging = 'true';
    
    const canvas = document.getElementById('board-canvas');
    const canvasRect = canvas.getBoundingClientRect();
    
    let x = e.clientX - canvasRect.left - offset.x;
    let y = e.clientY - canvasRect.top - offset.y;
    
    // Bounds check
    x = Math.max(0, Math.min(x, 2000 - 280));
    y = Math.max(0, Math.min(y, 2000 - 400));
    
    draggedElement.style.transform = `translate(${x}px, ${y}px)`;
    
    // Update State
    const id = draggedElement.dataset.id;
    const idea = ideas.find(i => i.id === id);
    if (idea) {
        idea.position = { x, y };
        renderConnections();
        renderGroups();
    }
}

function stopDragging() {
    if (draggedElement) {
        saveData();
        renderList(); // Refresh list to keep sync (though scroll might jump)
        draggedElement = null;
    }
    document.removeEventListener('mousemove', onDragging);
    document.removeEventListener('mouseup', stopDragging);
}

// --- Detail Panel Logic ---
function openDetail(id) {
    currentIdeaId = id;
    const idea = ideas.find(i => i.id === id);
    if (!idea) return;

    const panel = document.getElementById('detail-panel');
    panel.classList.add('detail-panel--active');

    // Fill Data
    document.getElementById('detail-title').innerText = idea.title;
    document.getElementById('detail-description').innerText = idea.description;
    document.getElementById('detail-author').innerText = idea.author;
    document.getElementById('detail-date').innerText = new Date(idea.createdAt).toLocaleString();
    
    const badge = document.getElementById('detail-badge');
    badge.innerText = idea.isAiGenerated ? 'AI 추천' : '일반';
    badge.className = `badge ${idea.isAiGenerated ? 'badge--ai' : ''}`;

    // Keywords
    const keywordContainer = document.getElementById('detail-keywords');
    keywordContainer.innerHTML = (idea.tags || []).map(tag => `<span class="keyword-tag ${selectedKeyword === tag ? 'keyword-tag--active' : ''}" data-tag="${tag}">${tag}</span>`).join('');
    document.getElementById('detail-keywords-input').value = (idea.tags || []).join(', ');
    
    keywordContainer.querySelectorAll('.keyword-tag').forEach(tagElem => {
        tagElem.onclick = () => {
            const tag = tagElem.dataset.tag;
            selectedKeyword = selectedKeyword === tag ? null : tag;
            renderAll();
        };
    });

    // Parent Link
    const parentSection = document.getElementById('parent-info');
    if (idea.parentIdeaId) {
        const parent = ideas.find(i => i.id === idea.parentIdeaId);
        parentSection.classList.remove('detail-panel__section--hidden');
        document.getElementById('parent-link').innerText = parent ? `원본: ${parent.title}` : '원본 아이디어가 삭제되었습니다.';
        document.getElementById('parent-link').onclick = () => parent && openDetail(parent.id);
    } else {
        parentSection.classList.add('detail-panel__section--hidden');
    }

    renderComments(idea.comments);
    renderFiles(idea.attachments);
    renderList(); // Update active state in list
}

function closeDetail() {
    currentIdeaId = null;
    document.getElementById('detail-panel').classList.remove('detail-panel--active');
    renderList();
}

function renderComments(comments) {
    const list = document.getElementById('comment-list');
    document.getElementById('comment-count').innerText = comments.length;
    list.innerHTML = comments.map(c => `
        <li class="comment-item">
            <div class="comment-item__header">
                <span class="comment-item__author">${c.author}</span>
                <span class="comment-item__date">${new Date(c.createdAt).toLocaleDateString()}</span>
            </div>
            <div class="comment-item__content">${c.content}</div>
        </li>
    `).join('');
}

function renderFiles(files) {
    const list = document.getElementById('file-list');
    list.innerHTML = files.map(f => `
        <li class="file-item">
            <span class="file-item__icon">${f.type === 'image' ? '🖼️' : '📄'}</span>
            <span class="file-item__name">${f.name}</span>
            <button class="button--close" onclick="removeFile('${f.id}')" style="font-size: 1rem; margin-left: auto;">&times;</button>
        </li>
    `).join('');
}

function addNewIdea() {
    const title = document.getElementById('new-title').value;
    const desc = document.getElementById('new-desc').value;
    const keywordText = document.getElementById('new-keywords').value;
    
    if (!title.trim()) return alert('제목을 입력하세요');

    const tags = keywordText.split(',').map(t => t.trim()).filter(t => t);

    const newIdea = {
        id: Date.now().toString(),
        title,
        description: desc,
        author: 'User',
        createdAt: new Date().toISOString(),
        position: { x: 100, y: 100 },
        tags,
        isAiGenerated: false,
        parentIdeaId: null,
        comments: [],
        attachments: []
    };

    ideas.push(newIdea);
    saveData();
    renderAll();
    closeModal();
    
    // Clear form
    document.getElementById('new-title').value = '';
    document.getElementById('new-desc').value = '';
}

function deleteCurrentIdea() {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    ideas = ideas.filter(i => i.id !== currentIdeaId);
    saveData();
    renderAll();
    closeDetail();
}

function toggleEditMode() {
    const titleElem = document.getElementById('detail-title');
    const descElem = document.getElementById('detail-description');
    const isEditing = titleElem.contentEditable === 'true';

    if (!isEditing) {
        titleElem.contentEditable = 'true';
        descElem.contentEditable = 'true';
        titleElem.focus();
        document.getElementById('btn-edit-idea').classList.add('detail-panel__btn-save--hidden');
        document.getElementById('btn-save-idea').classList.remove('detail-panel__btn-save--hidden');
        document.getElementById('detail-keywords').classList.add('detail-panel__input--hidden');
        document.getElementById('detail-keywords-input').classList.remove('detail-panel__input--hidden');
    } else {
        saveEditedIdea();
    }
}

function saveEditedIdea() {
    const idea = ideas.find(i => i.id === currentIdeaId);
    if (idea) {
        idea.title = document.getElementById('detail-title').innerText;
        idea.description = document.getElementById('detail-description').innerText;
        const keywordText = document.getElementById('detail-keywords-input').value;
        idea.tags = keywordText.split(',').map(t => t.trim()).filter(t => t);
        saveData();
        renderAll();
    }
    
    const titleElem = document.getElementById('detail-title');
    const descElem = document.getElementById('detail-description');
    titleElem.contentEditable = 'false';
    descElem.contentEditable = 'false';
    
    document.getElementById('btn-edit-idea').classList.remove('detail-panel__btn-save--hidden');
    document.getElementById('btn-save-idea').classList.add('detail-panel__btn-save--hidden');
    document.getElementById('detail-keywords').classList.remove('detail-panel__input--hidden');
    document.getElementById('detail-keywords-input').classList.add('detail-panel__input--hidden');
}

// --- AI Recommendation (Dummy) ---
function generateAiRecommendations() {
    const baseIdea = ideas.find(i => i.id === currentIdeaId) || ideas[ideas.length - 1];
    
    const aiTitles = [
        `[익스텐션] ${baseIdea.title} 플랫폼화`,
        `[타겟 확장] ${baseIdea.title} B2B 모델`,
        `[글로벌] ${baseIdea.title} 해외 진출 전략`
    ];

    aiTitles.forEach((title, idx) => {
        const newAiIdea = {
            id: `ai-${Date.now()}-${idx}`,
            title,
            description: `AI가 제안하는 '${baseIdea.title}'의 확장안입니다. 기존 개념을 강화하고 새로운 시장 가치를 창출하기 위한 추가 로직을 포함합니다.`,
            author: 'IdeaSpark AI',
            createdAt: new Date().toISOString(),
            position: { 
                x: baseIdea.position.x + 320 + (idx * 20), 
                y: baseIdea.position.y + (idx * 150) - 100 
            },
            tags: ['AI-Recommended'],
            isAiGenerated: true,
            parentIdeaId: baseIdea.id,
            comments: [],
            attachments: []
        };
        ideas.push(newAiIdea);
    });

    saveData();
    renderAll();
}

// --- Comments & Files ---
function addComment() {
    const text = document.getElementById('comment-textarea').value;
    if (!text.trim()) return;

    const idea = ideas.find(i => i.id === currentIdeaId);
    if (idea) {
        idea.comments.push({
            id: Date.now().toString(),
            author: 'User',
            content: text,
            createdAt: new Date().toISOString()
        });
        saveData();
        renderComments(idea.comments);
        document.getElementById('comment-textarea').value = '';
        renderAll();
    }
}

function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const idea = ideas.find(i => i.id === currentIdeaId);
    if (idea) {
        idea.attachments.push({
            id: Date.now().toString(),
            name: file.name,
            type: file.type.includes('image') ? 'image' : 'document'
        });
        saveData();
        renderFiles(idea.attachments);
    }
}

function removeFile(fileId) {
    const idea = ideas.find(i => i.id === currentIdeaId);
    if (idea) {
        idea.attachments = idea.attachments.filter(f => f.id !== fileId);
        saveData();
        renderFiles(idea.attachments);
    }
}

// --- Zoom Logic ---
function updateZoom(delta) {
    if (delta === 0) zoomLevel = 1;
    else zoomLevel = Math.max(0.1, Math.min(3, zoomLevel + delta));
    
    const canvas = document.getElementById('board-canvas');
    canvas.style.transform = `scale(${zoomLevel})`;
    document.getElementById('zoom-level').innerText = `${Math.round(zoomLevel * 100)}%`;
}

function zoomFit() {
    if (ideas.length === 0) return updateZoom(0);
    
    const board = document.getElementById('board');
    const boardRect = board.getBoundingClientRect();
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    ideas.forEach(idea => {
        minX = Math.min(minX, idea.position.x);
        minY = Math.min(minY, idea.position.y);
        maxX = Math.max(maxX, idea.position.x + 280);
        maxY = Math.max(maxY, idea.position.y + 400);
    });
    
    const contentWidth = maxX - minX + 200;
    const contentHeight = maxY - minY + 200;
    
    const scaleX = (boardRect.width - 40) / contentWidth;
    const scaleY = (boardRect.height - 40) / contentHeight;
    zoomLevel = Math.min(1, scaleX, scaleY);
    
    updateZoom(0);
    
    // Pan to content (simple approach: scroll board)
    board.scrollLeft = minX * zoomLevel - 20;
    board.scrollTop = minY * zoomLevel - 20;
}

// --- Connections Logic ---
function connectSelected() {
    if (selectedIds.length !== 2) return alert('두 개의 아이디어를 선택해주세요 (Shift+클릭)');
    
    const [parentId, childId] = selectedIds;
    if (connections.find(c => (c.parentId === parentId && c.childId === childId))) return;
    
    connections.push({ parentId, childId });
    saveData();
    renderAll();
}

function renderConnections() {
    const svg = document.getElementById('board-svg');
    svg.innerHTML = `
        <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#98A1B3" />
            </marker>
        </defs>
    ` + connections.map(conn => {
        const p1 = ideas.find(i => i.id === conn.parentId);
        const p2 = ideas.find(i => i.id === conn.childId);
        if (!p1 || !p2) return '';
        
        // Center of cards
        const x1 = p1.position.x + 140;
        const y1 = p1.position.y + 200;
        const x2 = p2.position.x + 140;
        const y2 = p2.position.y + 200;
        
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="board__line" marker-end="url(#arrowhead)" />`;
    }).join('') + ideas.filter(i => i.parentIdeaId).map(idea => {
        const p1 = ideas.find(i => i.id === idea.parentIdeaId);
        const p2 = idea;
        if (!p1) return '';
        const x1 = p1.position.x + 140;
        const y1 = p1.position.y + 200;
        const x2 = p2.position.x + 140;
        const y2 = p2.position.y + 200;
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="board__line" marker-end="url(#arrowhead)" />`;
    }).join('');
}

// --- Grouping Logic ---
function groupSelected() {
    if (selectedIds.length < 2) return alert('두 개 이상의 아이디어를 선택해주세요 (Shift+클릭)');
    const groupName = prompt('그룹 이름을 입력하세요:', '새 그룹');
    if (!groupName) return;
    
    groups.push({
        id: Date.now().toString(),
        name: groupName,
        ideaIds: [...selectedIds]
    });
    saveData();
    renderAll();
}

function renderGroups() {
    const container = document.getElementById('board-groups');
    container.innerHTML = groups.map(group => {
        const groupIdeas = ideas.filter(i => group.ideaIds.includes(i.id));
        if (groupIdeas.length === 0) return '';
        
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        groupIdeas.forEach(i => {
            minX = Math.min(minX, i.position.x);
            minY = Math.min(minY, i.position.y);
            maxX = Math.max(maxX, i.position.x + 280);
            maxY = Math.max(maxY, i.position.y + 400);
        });
        
        const padding = 20;
        return `
            <div class="board__group-box" style="left: ${minX - padding}px; top: ${minY - padding}px; width: ${maxX - minX + padding * 2}px; height: ${maxY - minY + padding * 2}px;">
                <span class="board__group-label">${group.name}</span>
            </div>
        `;
    }).join('');
}

// --- Event Listeners ---
function setupEventListeners() {
    document.getElementById('btn-add-idea').onclick = () => openModal();
    document.getElementById('btn-close-modal').onclick = closeModal;
    document.getElementById('btn-cancel-add').onclick = closeModal;
    document.getElementById('btn-confirm-add').onclick = addNewIdea;
    
    document.getElementById('btn-close-detail').onclick = closeDetail;
    document.getElementById('detail-overlay').onclick = closeDetail;
    document.getElementById('btn-delete-idea').onclick = deleteCurrentIdea;
    document.getElementById('btn-edit-idea').onclick = toggleEditMode;
    document.getElementById('btn-save-idea').onclick = toggleEditMode;
    
    document.getElementById('btn-ai-recommend').onclick = generateAiRecommendations;
    document.getElementById('btn-add-comment').onclick = addComment;
    document.getElementById('file-input').onchange = handleFileUpload;

    document.getElementById('search-input').oninput = () => {
        renderList();
        renderBoard();
    };
    document.getElementById('sort-select').onchange = renderList;

    // New Controls
    document.getElementById('btn-zoom-in').onclick = () => updateZoom(0.1);
    document.getElementById('btn-zoom-out').onclick = () => updateZoom(-0.1);
    document.getElementById('btn-zoom-fit').onclick = zoomFit;
    document.getElementById('btn-connect-cards').onclick = connectSelected;
    document.getElementById('btn-group-cards').onclick = groupSelected;
}

// --- Modal Helper ---
function openModal() {
    document.getElementById('add-modal').classList.add('modal--active');
}

function closeModal() {
    document.getElementById('add-modal').classList.remove('modal--active');
}

// Run On Load
window.onload = init;
