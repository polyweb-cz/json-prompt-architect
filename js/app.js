// JSON Prompt Architect - Main Application
document.addEventListener('DOMContentLoaded', function() {

    // ===== MASTER JSON STATE =====
    let masterJson = { fields: [] };

    // ===== UTILITY FUNCTIONS =====
    function generateId() {
        return 'field_' + Math.random().toString(36).substr(2, 9);
    }

    // ===== DOM ELEMENTS =====
    const jsonBlocksContainer = document.getElementById('jsonBlocksContainer');
    const emptyState = document.getElementById('emptyState');
    const addKeyValueBtn = document.getElementById('addKeyValueBtn');
    const addSectionBtn = document.getElementById('addSectionBtn');
    const showMasterJsonBtn = document.getElementById('showMasterJsonBtn');
    const masterJsonModal = document.getElementById('masterJsonModal');
    const masterJsonPreviewEl = document.getElementById('masterJsonPreview');
    const copyMasterJsonBtn = document.getElementById('copyMasterJsonBtn');
    const useFormContainer = document.getElementById('useFormContainer');
    const jsonOutputPreviewEl = document.getElementById('jsonOutputPreview');
    const copyJsonBtn = document.getElementById('copyJsonBtn');

    let masterJsonEditor = null;
    let outputJsonEditor = null;

    // Initialize CodeMirror for Master JSON Preview
    if (masterJsonPreviewEl && typeof CodeMirror !== 'undefined') {
        masterJsonEditor = CodeMirror(masterJsonPreviewEl, {
            mode: { name: 'javascript', json: true },
            lineNumbers: true,
            readOnly: true,
            lineWrapping: true,
            tabSize: 2
        });
    }

    // Initialize CodeMirror for Output JSON Preview
    if (jsonOutputPreviewEl && typeof CodeMirror !== 'undefined') {
        outputJsonEditor = CodeMirror(jsonOutputPreviewEl, {
            mode: { name: 'javascript', json: true },
            lineNumbers: true,
            readOnly: true,
            lineWrapping: true,
            tabSize: 2
        });
    }

    // ===== CONVERT PLAIN JSON TO MASTER JSON =====
    function convertToMasterJson(obj, parentPath = '') {
        const fields = [];

        for (const [key, value] of Object.entries(obj)) {
            const id = generateId();

            if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                // It's a nested object - create section
                fields.push({
                    id: id,
                    type: 'section',
                    key: key,
                    collapsed: false,
                    children: convertToMasterJson(value, parentPath + key + '.')
                });
            } else {
                // Primitive value or array - create text field
                let defaultValue = value;
                if (Array.isArray(value)) {
                    defaultValue = JSON.stringify(value);
                } else if (typeof value !== 'string') {
                    defaultValue = String(value);
                }

                fields.push({
                    id: id,
                    type: 'text',
                    key: key,
                    defaultValue: defaultValue,
                    validation: {}
                });
            }
        }

        return fields;
    }

    // ===== SORTABLE INITIALIZATION =====
    let rootSortable = null;

    function initSortable(container, fieldsArray) {
        if (typeof Sortable === 'undefined') return null;

        return new Sortable(container, {
            group: 'nested', // Allow dragging between lists
            animation: 150,
            handle: '.drag-handle',
            draggable: '.json-block, .json-section',
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            fallbackOnBody: true,
            swapThreshold: 0.65,
            onEnd: function(evt) {
                // If moving between lists, Sortable handles the array manipulation via the 'group' option? 
                // Actually SortableJS with frameworks often requires manual array management.
                // However, for this vanilla JS implementation, we need to be careful.
                // Since we are not using a reactive framework, simply re-rendering might be safer,
                // or we trust Sortable's DOM manipulation and just validate.
                // But wait, masterJson needs to be updated.
                
                // Note: Complex nested reordering in vanilla JS with just this array splice logic 
                // is difficult if moving across arrays. 
                // For now, we will stick to the existing logic which handles reordering within the SAME list.
                // If 'evt.from' !== 'evt.to', we need to handle cross-list movement.
                
                // IMPORTANT: The previous implementation only handled reordering within the same list.
                // Handling cross-list updates in the data model (masterJson) requires finding the source and target arrays.
                
                // Trigger validation to clear/set errors based on new location
                validateDuplicateKeys();
            }
        });
    }

    // SortableJS's native 'group' feature moves DOM elements, but we need to sync `masterJson`.
    // We need a more robust way to sync the data model when items move between lists.
    // Given the complexity of implementing manual array syncing for nested lists in vanilla JS without a framework,
    // we will rely on DOM parsing to rebuild masterJson or accept that we need to find the specific arrays.
    
    // BETTER APPROACH FOR DATA SYNC:
    // Since we are building a visual tool, it is often easier to rebuild the JSON model from the DOM 
    // after a complex drop, OR simply attach the data object to the DOM element and move it.
    
    // Let's refine initSortable to handle the Data Model update properly for cross-list drops.
    
    function initSortable(container, fieldsArray) {
        if (typeof Sortable === 'undefined') return null;

        return new Sortable(container, {
            group: 'nested',
            animation: 150,
            handle: '.drag-handle',
            draggable: '.json-block, .json-section',
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            fallbackOnBody: true,
            swapThreshold: 0.65,
            onEnd: function(evt) {
                const itemEl = evt.item;
                const newIndex = evt.newIndex;
                const oldIndex = evt.oldIndex;
                const toContainer = evt.to;
                const fromContainer = evt.from;
                
                // If the item wasn't moved to a new position, do nothing
                if (newIndex === oldIndex && toContainer === fromContainer) return;

                // We need to move the data in masterJson.
                // 1. Find the object in the source array
                // 2. Remove it
                // 3. Insert it into the target array
                
                // To do this effectively, we need reference to the arrays.
                // 'fieldsArray' passed to this function is the array for THIS container.
                // However, Sortable doesn't give us the 'fieldsArray' of the 'to' container easily in the onEnd event of the 'from' container.
                
                // Alternative: Rebuild masterJson from DOM after every drag. 
                // This is robust and prevents state desync.
                rebuildMasterJsonFromDom();
                validateDuplicateKeys();
            }
        });
    }
    
    function rebuildMasterJsonFromDom() {
        masterJson.fields = parseDomToFields(jsonBlocksContainer);
    }
    
    function parseDomToFields(container) {
        const fields = [];
        // Get direct children only
        const children = Array.from(container.children).filter(el => 
            el.classList.contains('json-block') || el.classList.contains('json-section')
        );
        
        children.forEach(el => {
            const id = el.dataset.id;
            const existingField = findFieldById(masterJson.fields, id)?.field;
            
            if (existingField) {
                // Keep the existing reference to preserve data, but update structure
                if (existingField.type === 'section') {
                    // Recursively find children in the DOM
                    const childrenContainer = el.querySelector('.section-children');
                    if (childrenContainer) {
                        existingField.children = parseDomToFields(childrenContainer);
                    }
                }
                fields.push(existingField);
            }
        });
        return fields;
    }

    function initRootSortable() {
        if (rootSortable) {
            rootSortable.destroy();
            rootSortable = null;
        }
        rootSortable = initSortable(jsonBlocksContainer, masterJson.fields);
    }

    // ===== RENDER EDIT MODE =====
    function renderEditMode() {
        // Clear container (except empty state)
        const blocks = jsonBlocksContainer.querySelectorAll('.json-block, .json-section');
        blocks.forEach(block => block.remove());

        // Render fields
        masterJson.fields.forEach(field => {
            const element = createBlockElement(field);
            jsonBlocksContainer.insertBefore(element, emptyState);
        });

        // Update empty state visibility
        updateEmptyState();

        // Initialize sortable for root level
        initRootSortable();
    }

    function createBlockElement(field) {
        if (field.type === 'section') {
            return createSectionElement(field);
        } else {
            return createKeyValueElement(field);
        }
    }

    function createKeyValueElement(field) {
        const div = document.createElement('div');
        div.className = 'json-block';
        div.dataset.id = field.id;
        div.dataset.type = 'keyvalue';

        div.innerHTML = `
            <span class="drag-handle" title="Drag to reorder">&#9776;</span>
            <input type="text" class="form-control form-control-sm block-key" placeholder="Key" value="${escapeHtml(field.key || '')}">
            <select class="form-select form-select-sm block-type">
                <option value="text" ${field.type === 'text' ? 'selected' : ''}>Text</option>
            </select>
            <input type="text" class="form-control form-control-sm block-value" placeholder="Default value" value="${escapeHtml(field.defaultValue || '')}">
            <button type="button" class="btn-delete" title="Delete">&times;</button>
        `;

        // Event listeners
        div.querySelector('.block-key').addEventListener('input', (e) => {
            updateFieldInMasterJson(field.id, 'key', e.target.value);
            validateDuplicateKeys();
        });

        div.querySelector('.block-type').addEventListener('change', (e) => {
            updateFieldInMasterJson(field.id, 'type', e.target.value);
        });

        div.querySelector('.block-value').addEventListener('input', (e) => {
            updateFieldInMasterJson(field.id, 'defaultValue', e.target.value);
        });

        div.querySelector('.btn-delete').addEventListener('click', () => {
            removeFieldFromMasterJson(field.id);
            div.remove();
            updateEmptyState();
        });

        return div;
    }

    function createSectionElement(field) {
        const div = document.createElement('div');
        div.className = 'json-section';
        div.dataset.id = field.id;
        div.dataset.type = 'section';

        div.innerHTML = `
            <div class="section-header d-flex align-items-center">
                <span class="drag-handle me-2" title="Drag to reorder">&#9776;</span>
                <input type="text" class="form-control form-control-sm section-name me-2" placeholder="Section name" value="${escapeHtml(field.key || '')}">
                
                <div class="form-check form-switch me-2" title="Collapse by default">
                    <input class="form-check-input section-collapsed" type="checkbox" id="collapsed_${field.id}" ${field.collapsed ? 'checked' : ''}>
                    <label class="form-check-label small text-muted" for="collapsed_${field.id}"><small>Collapsed</small></label>
                </div>
                
                <button type="button" class="btn-close ms-auto" aria-label="Delete section"></button>
            </div>
            <div class="section-children"></div>
            <div class="block-actions d-flex gap-2 mt-2">
                <button type="button" class="btn btn-outline-primary btn-sm add-child-keyvalue">+ Add Key/Value</button>
                <button type="button" class="btn btn-outline-secondary btn-sm add-child-section">+ Add Section</button>
            </div>
        `;

        const childrenContainer = div.querySelector('.section-children');

        // Render children
        if (field.children && field.children.length > 0) {
            field.children.forEach(child => {
                const childElement = createBlockElement(child);
                childrenContainer.appendChild(childElement);
            });
        }

        // Event listeners
        div.querySelector('.section-name').addEventListener('input', (e) => {
            updateFieldInMasterJson(field.id, 'key', e.target.value);
            validateDuplicateKeys();
        });
        
        div.querySelector('.section-collapsed').addEventListener('change', (e) => {
            updateFieldInMasterJson(field.id, 'collapsed', e.target.checked);
        });

        div.querySelector('.btn-close').addEventListener('click', () => {
            removeFieldFromMasterJson(field.id);
            div.remove();
            updateEmptyState();
        });

        div.querySelector('.add-child-keyvalue').addEventListener('click', () => {
            const newField = { id: generateId(), type: 'text', key: '', defaultValue: '', validation: {} };
            addChildToSection(field.id, newField);
            const newElement = createKeyValueElement(newField);
            childrenContainer.appendChild(newElement);
            // Re-bind sortable if needed? Sortable should handle new children if container is same.
            // But we might need to refresh? SortableJS usually observes DOM.
        });

        div.querySelector('.add-child-section').addEventListener('click', () => {
            const newField = { id: generateId(), type: 'section', key: '', collapsed: false, children: [] };
            addChildToSection(field.id, newField);
            const newElement = createSectionElement(newField);
            childrenContainer.appendChild(newElement);
        });

        // Initialize sortable for section children
        if (!field.children) field.children = [];
        initSortable(childrenContainer, field.children);

        return div;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function updateEmptyState() {
        if (emptyState) {
            const hasBlocks = masterJson.fields.length > 0;
            emptyState.style.display = hasBlocks ? 'none' : 'block';
        }
    }

    // ===== MASTER JSON MANIPULATION =====
    function findFieldById(fields, id) {
        for (const field of fields) {
            if (field.id === id) {
                return { field, parent: fields };
            }
            if (field.children) {
                const result = findFieldById(field.children, id);
                if (result) return result;
            }
        }
        return null;
    }

    function updateFieldInMasterJson(id, property, value) {
        const result = findFieldById(masterJson.fields, id);
        if (result) {
            result.field[property] = value;
        }
    }

    function removeFieldFromMasterJson(id) {
        const result = findFieldById(masterJson.fields, id);
        if (result) {
            const index = result.parent.indexOf(result.field);
            if (index > -1) {
                result.parent.splice(index, 1);
            }
        }
    }

    function addChildToSection(sectionId, newField) {
        const result = findFieldById(masterJson.fields, sectionId);
        if (result && result.field.type === 'section') {
            if (!result.field.children) {
                result.field.children = [];
            }
            result.field.children.push(newField);
        }
    }

    // ===== VALIDATION =====
    function validateDuplicateKeys() {
        // Simple validation - mark duplicates
        const allBlocks = jsonBlocksContainer.querySelectorAll('.json-block, .json-section');
        const keyMap = new Map();

        allBlocks.forEach(block => {
            const keyInput = block.querySelector('.block-key, .section-name');
            if (keyInput) {
                const key = keyInput.value.trim();
                if (key) {
                    // Get parent for scope
                    // Look for the closest section parent. If none, we are in root.
                    const parentSection = block.closest('.json-section');
                    // Important: If the block IS a section, we must look for its parent section (grandparent of the input), 
                    // BUT block.closest('.json-section') returns the block itself if it matches.
                    // So we need to look at the parent's closest section.
                    
                    const parentContainer = block.parentElement; 
                    // parentContainer is either jsonBlocksContainer (root) or .section-children
                    
                    const realParentSection = parentContainer.closest('.json-section');
                    const scope = realParentSection ? realParentSection.dataset.id : 'root';
                    
                    const scopeKey = scope + '::' + key;

                    if (keyMap.has(scopeKey)) {
                        block.classList.add('is-invalid');
                        keyMap.get(scopeKey).classList.add('is-invalid');
                    } else {
                        keyMap.set(scopeKey, block);
                        block.classList.remove('is-invalid');
                    }
                } else {
                    block.classList.remove('is-invalid');
                }
            }
        });
    }

    // ===== ROOT LEVEL ADD BUTTONS =====
    if (addKeyValueBtn) {
        addKeyValueBtn.addEventListener('click', () => {
            const newField = { id: generateId(), type: 'text', key: '', defaultValue: '', validation: {} };
            masterJson.fields.push(newField);
            const element = createKeyValueElement(newField);
            jsonBlocksContainer.insertBefore(element, emptyState);
            updateEmptyState();
            element.querySelector('.block-key').focus();
        });
    }

    if (addSectionBtn) {
        addSectionBtn.addEventListener('click', () => {
            const newField = { id: generateId(), type: 'section', key: '', collapsed: false, children: [] };
            masterJson.fields.push(newField);
            const element = createSectionElement(newField);
            jsonBlocksContainer.insertBefore(element, emptyState);
            updateEmptyState();
            element.querySelector('.section-name').focus();
        });
    }

    // ===== MASTER JSON PREVIEW =====
    if (masterJsonModal && masterJsonEditor) {
        masterJsonModal.addEventListener('shown.bs.modal', () => {
            masterJsonEditor.setValue(JSON.stringify(masterJson, null, 2));
            masterJsonEditor.refresh();
        });
    }

    if (copyMasterJsonBtn) {
        copyMasterJsonBtn.addEventListener('click', () => {
            const jsonStr = JSON.stringify(masterJson, null, 2);
            navigator.clipboard.writeText(jsonStr).then(() => {
                copyMasterJsonBtn.textContent = 'Copied!';
                setTimeout(() => {
                    copyMasterJsonBtn.textContent = 'Copy';
                }, 2000);
            });
        });
    }

    // ===== USE MODE =====
    function renderUseMode() {
        if (!useFormContainer) return;

        if (masterJson.fields.length === 0) {
            useFormContainer.innerHTML = '<p class="text-muted">No JSON structure defined. Go to EDIT MODE to create one.</p>';
            if (outputJsonEditor) {
                outputJsonEditor.setValue('{}');
            }
            return;
        }

        useFormContainer.innerHTML = '';
        renderUseFields(masterJson.fields, useFormContainer);
        updateOutputJson();
    }

    function renderUseFields(fields, container) {
        fields.forEach(field => {
            if (field.type === 'section') {
                const section = document.createElement('div');
                section.className = 'card mb-3';
                const isCollapsed = field.collapsed === true; // Default to false if undefined
                
                section.innerHTML = `
                    <div class="card-header py-2 d-flex align-items-center user-select-none" 
                         data-bs-toggle="collapse" 
                         data-bs-target="#collapse_${field.id}" 
                         aria-expanded="${!isCollapsed}" 
                         aria-controls="collapse_${field.id}" 
                         style="cursor: pointer;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-chevron-down me-2 transition-transform" viewBox="0 0 16 16" style="transition: transform 0.2s;">
                            <path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/>
                        </svg>
                        <strong>${escapeHtml(field.key || 'Unnamed Section')}</strong>
                    </div>
                    <div id="collapse_${field.id}" class="collapse ${isCollapsed ? '' : 'show'}">
                        <div class="card-body py-2"></div>
                    </div>
                `;
                
                const collapseEl = section.querySelector('.collapse');
                const chevron = section.querySelector('.bi-chevron-down');
                
                // Add event listeners to rotate chevron
                collapseEl.addEventListener('show.bs.collapse', () => {
                    chevron.style.transform = 'rotate(0deg)';
                });
                collapseEl.addEventListener('hide.bs.collapse', () => {
                    chevron.style.transform = 'rotate(-90deg)';
                });
                
                // Set initial rotation
                if (isCollapsed) {
                    chevron.style.transform = 'rotate(-90deg)';
                }

                const body = section.querySelector('.card-body');
                if (field.children && field.children.length > 0) {
                    renderUseFields(field.children, body);
                }
                container.appendChild(section);
            } else {
                const formGroup = document.createElement('div');
                formGroup.className = 'row mb-2 align-items-center';
                formGroup.innerHTML = `
                    <label class="col-md-3 col-form-label col-form-label-sm">${escapeHtml(field.key || 'Unnamed')}</label>
                    <div class="col-md-9">
                        <input type="text" class="form-control form-control-sm use-field" data-id="${field.id}" value="${escapeHtml(field.defaultValue || '')}">
                    </div>
                `;
                formGroup.querySelector('.use-field').addEventListener('input', updateOutputJson);
                container.appendChild(formGroup);
            }
        });
    }

    function updateOutputJson() {
        const output = buildFinalJson(masterJson.fields);
        if (outputJsonEditor) {
            outputJsonEditor.setValue(JSON.stringify(output, null, 2));
        }
    }

    function buildFinalJson(fields) {
        const result = {};

        fields.forEach(field => {
            if (field.type === 'section') {
                if (field.key) {
                    result[field.key] = buildFinalJson(field.children || []);
                }
            } else {
                if (field.key) {
                    // Get current value from USE form input
                    const input = document.querySelector(`.use-field[data-id="${field.id}"]`);
                    const value = input ? input.value : field.defaultValue;
                    result[field.key] = value;
                }
            }
        });

        return result;
    }

    // Copy output JSON
    if (copyJsonBtn && outputJsonEditor) {
        copyJsonBtn.addEventListener('click', () => {
            const jsonStr = outputJsonEditor.getValue();
            navigator.clipboard.writeText(jsonStr).then(() => {
                copyJsonBtn.textContent = 'Copied!';
                setTimeout(() => {
                    copyJsonBtn.textContent = 'Copy JSON';
                }, 2000);
            });
        });
    }

    // ===== TAB SWITCHING =====
    const useTab = document.getElementById('use-tab');
    if (useTab) {
        useTab.addEventListener('shown.bs.tab', () => {
            renderUseMode();
            if (outputJsonEditor) {
                outputJsonEditor.refresh();
            }
        });
    }

    // ===== SIDEBAR TOGGLE =====
    // Sidebar toggle functionality
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    
    // Check if all required elements exist before setting up sidebar
    if (menuToggle && sidebar && sidebarOverlay) {
        function toggleSidebar() {
            const isExpanded = sidebar.classList.toggle('show');
            sidebarOverlay.classList.toggle('show');
            menuToggle.setAttribute('aria-expanded', isExpanded);
        }
        
        menuToggle.addEventListener('click', toggleSidebar);
        sidebarOverlay.addEventListener('click', toggleSidebar);
    } else {
        console.error('Required elements for sidebar not found');
    }

    const jsonPromptModal = document.getElementById('jsonPromptModal');
    const jsonPromptEditorEl = document.getElementById('jsonPromptEditor');
    const jsonPromptError = document.getElementById('jsonPromptError');
    const saveJsonPrompt = document.getElementById('saveJsonPrompt');
    const formatJsonPrompt = document.getElementById('formatJsonPrompt');
    const formatJsonPromptWrapper = document.getElementById('formatJsonPromptWrapper');
    const addJsonButton = document.getElementById('addJsonButton');

    let ajv = null;
    let schemaValidator = null;
    let jsonEditor = null;

    // Initialize Ajv for future schema validation (schemaValidator stays null until a schema is set)
    if (typeof Ajv !== 'undefined') {
        ajv = new Ajv({ allErrors: true, strict: false });
    }

    // Initialize CodeMirror
    if (jsonPromptEditorEl && typeof CodeMirror !== 'undefined') {
        jsonEditor = CodeMirror(jsonPromptEditorEl, {
            mode: { name: 'javascript', json: true },
            lineNumbers: true,
            lineWrapping: true,
            tabSize: 2,
            indentWithTabs: false
        });

        jsonEditor.on('change', function() {
            validateJsonPrompt();
        });
    }

    function setJsonPromptValidity(isValid, message) {
        if (!jsonEditor || !jsonPromptError || !saveJsonPrompt) {
            return;
        }
        const cmElement = jsonEditor.getWrapperElement();
        cmElement.classList.toggle('cm-invalid', !isValid);
        jsonPromptError.classList.toggle('d-none', isValid);
        if (!isValid) {
            jsonPromptError.textContent = message || 'Invalid JSON.';
        }
        saveJsonPrompt.disabled = !isValid;

        // Update Format button state
        if (formatJsonPrompt && formatJsonPromptWrapper) {
            formatJsonPrompt.disabled = !isValid;
            if (isValid) {
                formatJsonPromptWrapper.removeAttribute('title');
            } else if (message === 'JSON is required.') {
                formatJsonPromptWrapper.setAttribute('title', 'Enter JSON to enable formatting');
            } else {
                formatJsonPromptWrapper.setAttribute('title', 'Fix JSON errors to enable formatting');
            }
        }
    }

    function getLineFromPosition(text, position) {
        if (position < 0 || position > text.length) {
            return null;
        }
        let line = 1;
        let column = 1;
        for (let i = 0; i < position && i < text.length; i++) {
            if (text[i] === '\n') {
                line++;
                column = 1;
            } else {
                column++;
            }
        }
        return { line, column };
    }

    function parseJsonError(error, jsonText) {
        const message = error.message || '';

        // Try to extract position from error message (e.g., "at position 123" or "at line 5 column 10")
        let positionMatch = message.match(/at position (\d+)/i);
        if (positionMatch) {
            const position = parseInt(positionMatch[1], 10);
            const location = getLineFromPosition(jsonText, position);
            if (location) {
                return `Syntax error at line ${location.line}, column ${location.column}: ${message}`;
            }
        }

        // Some browsers include line/column directly
        let lineMatch = message.match(/line (\d+)/i);
        let columnMatch = message.match(/column (\d+)/i);
        if (lineMatch) {
            const line = lineMatch[1];
            const column = columnMatch ? columnMatch[1] : '?';
            return `Syntax error at line ${line}, column ${column}: ${message}`;
        }

        // Fallback: try to find common JSON syntax issues and locate them
        return `JSON syntax error: ${message}`;
    }

    function validateJsonPrompt() {
        if (!jsonEditor) {
            return false;
        }

        const value = jsonEditor.getValue().trim();
        if (!value) {
            setJsonPromptValidity(false, 'JSON is required.');
            return false;
        }

        try {
            const parsed = JSON.parse(value);
            if (schemaValidator && !schemaValidator(parsed)) {
                const errors = ajv ? ajv.errorsText(schemaValidator.errors, { separator: ', ' }) : 'JSON does not match schema.';
                setJsonPromptValidity(false, errors || 'JSON does not match schema.');
                return false;
            }
        } catch (error) {
            const errorMessage = parseJsonError(error, value);
            setJsonPromptValidity(false, errorMessage);
            return false;
        }

        setJsonPromptValidity(true, '');
        return true;
    }

    if (saveJsonPrompt && jsonPromptModal) {
        saveJsonPrompt.addEventListener('click', () => {
            if (!validateJsonPrompt()) {
                return;
            }

            // Convert imported JSON to Master JSON and render
            try {
                const value = jsonEditor.getValue().trim();
                const parsed = JSON.parse(value);
                masterJson.fields = convertToMasterJson(parsed);
                renderEditMode();

                // Switch to EDIT tab
                const editTab = document.getElementById('edit-tab');
                if (editTab) {
                    const tab = new bootstrap.Tab(editTab);
                    tab.show();
                }
            } catch (error) {
                console.error('Failed to convert JSON:', error);
            }

            const modalInstance = bootstrap.Modal.getInstance(jsonPromptModal) || new bootstrap.Modal(jsonPromptModal);
            modalInstance.hide();
        });

        jsonPromptModal.addEventListener('hidden.bs.modal', () => {
            if (jsonEditor) {
                jsonEditor.setValue('');
            }
            setJsonPromptValidity(false, 'JSON is required.');
        });

        // Refresh CodeMirror when modal is shown (fixes rendering issues)
        jsonPromptModal.addEventListener('shown.bs.modal', () => {
            if (jsonEditor) {
                jsonEditor.refresh();
                jsonEditor.focus();
            }
        });
    }

    if (addJsonButton) {
        addJsonButton.addEventListener('click', () => {
            setJsonPromptValidity(false, 'JSON is required.');
        });
    }

    // Format JSON button
    if (formatJsonPrompt && jsonEditor) {
        formatJsonPrompt.addEventListener('click', () => {
            const value = jsonEditor.getValue().trim();
            const parsed = JSON.parse(value);
            const formatted = JSON.stringify(parsed, null, 2);
            jsonEditor.setValue(formatted);
        });
    }

    // Initialize root sortable on load
    initRootSortable();
});
