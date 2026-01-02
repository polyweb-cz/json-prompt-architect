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
    const onlyValidJsonToggle = document.getElementById('onlyValidJsonToggle');
    
    // Use Mode Actions
    const shareBtn = document.getElementById('shareBtn');
    const openChatGptBtn = document.getElementById('openChatGptBtn');
    const openGeminiBtn = document.getElementById('openGeminiBtn');

    let masterJsonEditor = null;
    let outputJsonEditor = null;

    // ... (rest of the file) ...

    function updateOutputJson() {
        const showOnlyValid = onlyValidJsonToggle ? onlyValidJsonToggle.checked : true;
        const validation = validateAllUseFields();
        
        if (showOnlyValid && !validation.isValid) {
            const errorMsg = "Validation Errors:\n\n" + validation.errors.join('\n');
            if (outputJsonEditor) {
                outputJsonEditor.setValue(errorMsg);
            }
            return;
        }

        const output = buildFinalJson(masterJson.fields);
        if (outputJsonEditor) {
            outputJsonEditor.setValue(JSON.stringify(output, null, 2));
        }
    }
    
    if (onlyValidJsonToggle) {
        onlyValidJsonToggle.addEventListener('change', updateOutputJson);
    }

    function buildFinalJson(fields) {
        // ... (existing code) ...
    }

    // ... (copy buttons) ...

    // ... (tab switching) ...

    // ... (sidebar) ...

    // ... (validation logic) ...
    
    /**
     * Get the current value of a field from the Use form
     */
    function getFieldValue(field) {
        if (field.type === 'checkbox') {
            const input = document.querySelector(`.use-field[data-id="${field.id}"]`);
            return input ? input.checked : field.defaultValue;
        } else if (field.type === 'radio') {
            const checked = document.querySelector(`.use-field[data-id="${field.id}"]:checked`);
            return checked ? checked.value : field.defaultValue;
        } else if (field.type === 'checkboxList') {
            const checked = document.querySelectorAll(`.use-field[data-id="${field.id}"]:checked`);
            if (checked.length > 0 || document.querySelector(`.use-field[data-id="${field.id}"]`)) {
                return Array.from(checked).map(el => el.value);
            }
            return field.defaultValue || [];
        } else if (field.type === 'multiselect') {
            const select = document.querySelector(`.use-field[data-id="${field.id}"]`);
            if (select) {
                return Array.from(select.selectedOptions).map(opt => opt.value);
            }
            return field.defaultValue || [];
        } else {
            // text, textarea, select
            const input = document.querySelector(`.use-field[data-id="${field.id}"]`);
            return input ? input.value : (field.defaultValue || '');
        }
    }

    function checkFieldValidity(field, value) {
        // Length validation for text/textarea
        if (field.validation?.minLength && typeof value === 'string' && value.length < field.validation.minLength) {
            return `"${field.key}": Minimum length is ${field.validation.minLength} characters (current: ${value.length}).`;
        }
        if (field.validation?.maxLength && typeof value === 'string' && value.length > field.validation.maxLength) {
            return `"${field.key}": Maximum length is ${field.validation.maxLength} characters (current: ${value.length}).`;
        }

        // Count validation for multiselect/checkboxList
        if (Array.isArray(value)) {
            const count = value.length;
            if (field.validation?.minCount !== undefined && count < field.validation.minCount) {
                return `"${field.key}": Minimum ${field.validation.minCount} option(s) required (current: ${count}).`;
            }
            if (field.validation?.maxCount !== undefined && count > field.validation.maxCount) {
                return `"${field.key}": Maximum ${field.validation.maxCount} option(s) allowed (current: ${count}).`;
            }
        }

        return null;
    }

    function validateUseField(input, field) {
        const val = getFieldValue(field);
        const error = checkFieldValidity(field, val);
        
        // Strip field key for inline error
        const inlineError = error ? error.substring(error.indexOf(':') + 2) : '';
        
        if (error) {
            input.classList.add('is-invalid');
            let next = input.nextElementSibling;
            while(next) {
                if (next.classList.contains('invalid-feedback')) {
                    next.textContent = inlineError;
                    break;
                }
                next = next.nextElementSibling;
            }
        } else {
            input.classList.remove('is-invalid');
        }
    }
    
    function validateAllUseFields(fields = masterJson.fields) {
        let isValid = true;
        let errors = [];

        function recurse(currentFields) {
            currentFields.forEach(field => {
                if (field.type === 'section') {
                    if (field.children) recurse(field.children);
                } else if (field.key) {
                    const value = getFieldValue(field);
                    const error = checkFieldValidity(field, value);
                    if (error) {
                        isValid = false;
                        errors.push(error);
                    }
                }
            });
        }

        recurse(fields);
        return { isValid, errors };
    }

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
                
                // Determine initial type and validation
                let type = 'text';
                let validation = { minLength: 0, maxLength: 64 };
                
                // Heuristic: If string is long or has newlines, use textarea
                if (typeof value === 'string' && (value.length > 64 || value.includes('\n'))) {
                    type = 'textarea';
                    validation = { minLength: 0, maxLength: 255 };
                }

                fields.push({
                    id: id,
                    type: type,
                    key: key,
                    defaultValue: defaultValue,
                    validation: validation
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
            draggable: '.json-block-wrapper, .json-section',
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
            el.classList.contains('json-block-wrapper') || el.classList.contains('json-section')
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
        const blocks = jsonBlocksContainer.querySelectorAll('.json-block-wrapper, .json-section');
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

    function needsOptions(type) {
        return ['select', 'multiselect', 'radio', 'checkboxList'].includes(type);
    }

    function needsCountValidation(type) {
        return ['multiselect', 'checkboxList'].includes(type);
    }

    function needsLengthValidation(type) {
        return ['text', 'textarea'].includes(type);
    }

    function needsSingleDefault(type) {
        return ['select', 'radio'].includes(type);
    }

    /**
     * Renders the options editor for select/multiselect/radio/checkboxList types
     * @param {Object} field - The field object
     * @param {HTMLElement} container - The container to render into
     */
    function renderOptionsEditor(field, container) {
        // Ensure options array exists
        if (!field.options || field.options.length === 0) {
            field.options = ['Option 1'];
            updateFieldInMasterJson(field.id, 'options', field.options);
        }

        const isSingleDefault = needsSingleDefault(field.type);
        const inputType = isSingleDefault ? 'radio' : 'checkbox';
        const radioName = `default_${field.id}`;

        // Clear container
        container.innerHTML = '';

        // Create options list
        const optionsList = document.createElement('div');
        optionsList.className = 'options-list';

        // Get current defaults
        let currentDefaults = [];
        if (field.defaultValue) {
            currentDefaults = Array.isArray(field.defaultValue) ? field.defaultValue : [field.defaultValue];
        }

        // Render each option
        field.options.forEach((opt, index) => {
            const row = document.createElement('div');
            row.className = 'option-row d-flex align-items-center gap-1 mb-1';
            row.dataset.index = index;

            const isChecked = currentDefaults.includes(opt);
            const canDelete = field.options.length > 1;

            row.innerHTML = `
                <input type="${inputType}" class="form-check-input option-default mt-0"
                       ${isSingleDefault ? `name="${radioName}"` : ''}
                       ${isChecked ? 'checked' : ''}
                       value="${index}"
                       title="Set as default">
                <input type="text" class="form-control form-control-sm option-value flex-grow-1"
                       value="${escapeHtml(opt)}" placeholder="Option value">
                <span class="option-drag-handle px-1" style="cursor: grab; opacity: 0.5;" title="Drag to reorder"><i class="fa-solid fa-grip-vertical"></i></span>
                <button type="button" class="btn btn-sm btn-option-delete text-danger border-0 p-0 ${canDelete ? '' : 'invisible'}"
                        title="Remove option"><i class="fa-solid fa-xmark"></i></button>
            `;

            optionsList.appendChild(row);
        });

        container.appendChild(optionsList);

        // Add option button
        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'btn btn-sm btn-link text-decoration-none p-0 mt-1';
        addBtn.innerHTML = '<i class="fa-solid fa-plus me-1"></i>Add option';
        container.appendChild(addBtn);

        // Initialize SortableJS for drag & drop
        if (typeof Sortable !== 'undefined') {
            new Sortable(optionsList, {
                animation: 150,
                handle: '.option-drag-handle',
                ghostClass: 'bg-primary-subtle',
                onEnd: (evt) => {
                    // Reorder options array
                    const movedItem = field.options.splice(evt.oldIndex, 1)[0];
                    field.options.splice(evt.newIndex, 0, movedItem);
                    updateFieldInMasterJson(field.id, 'options', field.options);
                    // Re-render to update indices and delete button visibility
                    renderOptionsEditor(field, container);
                }
            });
        }

        // Event: Add new option
        addBtn.addEventListener('click', () => {
            const newOption = `Option ${field.options.length + 1}`;
            field.options.push(newOption);
            updateFieldInMasterJson(field.id, 'options', field.options);
            renderOptionsEditor(field, container);
        });

        // Event: Delete option
        optionsList.querySelectorAll('.btn-option-delete').forEach((btn, index) => {
            btn.addEventListener('click', () => {
                if (field.options.length > 1) {
                    const removedOpt = field.options[index];
                    field.options.splice(index, 1);
                    updateFieldInMasterJson(field.id, 'options', field.options);

                    // Update defaultValue if removed option was default
                    if (isSingleDefault && field.defaultValue === removedOpt) {
                        // For single default, select first available option
                        field.defaultValue = field.options[0] || '';
                        updateFieldInMasterJson(field.id, 'defaultValue', field.defaultValue);
                    } else if (!isSingleDefault && Array.isArray(field.defaultValue)) {
                        // For multi default, remove from array
                        field.defaultValue = field.defaultValue.filter(v => v !== removedOpt);
                        // If array becomes empty and minCount requires at least one, select first option
                        const minCount = field.validation?.minCount ?? 1;
                        if (field.defaultValue.length === 0 && minCount > 0 && field.options.length > 0) {
                            field.defaultValue = [field.options[0]];
                        }
                        updateFieldInMasterJson(field.id, 'defaultValue', field.defaultValue);
                    }

                    renderOptionsEditor(field, container);
                }
            });
        });

        // Event: Option value change
        optionsList.querySelectorAll('.option-value').forEach((input, index) => {
            input.addEventListener('input', (e) => {
                const oldValue = field.options[index];
                const newValue = e.target.value;
                field.options[index] = newValue;
                updateFieldInMasterJson(field.id, 'options', field.options);

                // Update defaultValue if this option was default
                if (isSingleDefault && field.defaultValue === oldValue) {
                    field.defaultValue = newValue;
                    updateFieldInMasterJson(field.id, 'defaultValue', field.defaultValue);
                } else if (!isSingleDefault && Array.isArray(field.defaultValue)) {
                    const idx = field.defaultValue.indexOf(oldValue);
                    if (idx !== -1) {
                        field.defaultValue[idx] = newValue;
                        updateFieldInMasterJson(field.id, 'defaultValue', field.defaultValue);
                    }
                }
            });
        });

        // Event: Default selection change
        optionsList.querySelectorAll('.option-default').forEach((input, index) => {
            input.addEventListener('change', () => {
                const optionValue = field.options[index];

                if (isSingleDefault) {
                    // Radio - single default
                    field.defaultValue = optionValue;
                } else {
                    // Checkbox - multiple defaults
                    if (!Array.isArray(field.defaultValue)) {
                        field.defaultValue = [];
                    }
                    if (input.checked) {
                        if (!field.defaultValue.includes(optionValue)) {
                            field.defaultValue.push(optionValue);
                        }
                    } else {
                        field.defaultValue = field.defaultValue.filter(v => v !== optionValue);
                    }
                }
                updateFieldInMasterJson(field.id, 'defaultValue', field.defaultValue);
            });
        });
    }

    function createKeyValueElement(field) {
        // Container for the whole block (the sortable item)
        const wrapper = document.createElement('div');
        wrapper.className = 'json-block-wrapper mb-2';
        wrapper.dataset.id = field.id;
        
        // Main block with border and background
        const div = document.createElement('div');
        div.className = 'json-block d-flex flex-column p-2 bg-light border rounded';
        
        // Row for inputs
        const inputRow = document.createElement('div');
        inputRow.className = 'd-flex align-items-start gap-2 w-100';

        // Settings panel (inside the main block)
        const settingsDiv = document.createElement('div');
        settingsDiv.className = 'json-block-settings p-2 mt-2 border-top bg-white rounded d-none w-100';
        // Render settings HTML
        settingsDiv.innerHTML = `
            <div class="row g-2">
                <!-- Length Validation -->
                <div class="col-md-6 length-validation">
                    <label class="form-label small mb-1">Min Length</label>
                    <input type="number" class="form-control form-control-sm setting-min-length" value="${field.validation?.minLength ?? ''}">
                </div>
                <div class="col-md-6 length-validation">
                    <label class="form-label small mb-1">Max Length</label>
                    <input type="number" class="form-control form-control-sm setting-max-length" value="${field.validation?.maxLength ?? ''}">
                </div>

                <!-- Count Validation -->
                <div class="col-md-6 count-validation d-none">
                    <label class="form-label small mb-1">Min Count</label>
                    <input type="number" class="form-control form-control-sm setting-min-count" value="${field.validation?.minCount ?? ''}">
                </div>
                <div class="col-md-6 count-validation d-none">
                    <label class="form-label small mb-1">Max Count</label>
                    <input type="number" class="form-control form-control-sm setting-max-count" value="${field.validation?.maxCount ?? ''}">
                </div>
            </div>
        `;

        function renderMainRow() {
            // Update UI based on type
            const showLength = needsLengthValidation(field.type);
            const showCount = needsCountValidation(field.type);

            const lengthValidation = settingsDiv.querySelectorAll('.length-validation');
            const countValidation = settingsDiv.querySelectorAll('.count-validation');

            if (lengthValidation.length) {
                if (showLength) lengthValidation.forEach(el => el.classList.remove('d-none'));
                else lengthValidation.forEach(el => el.classList.add('d-none'));
            }

            if (countValidation.length) {
                if (showCount) countValidation.forEach(el => el.classList.remove('d-none'));
                else countValidation.forEach(el => el.classList.add('d-none'));
            }

            // Determine input element based on type
            let valueInputHtml = '';
            const showOptionsEditor = needsOptions(field.type);

            if (showOptionsEditor) {
                // For select/multiselect/radio/checkboxList - will be populated by renderOptionsEditor()
                valueInputHtml = '<div class="options-editor-container"></div>';
            } else if (field.type === 'textarea') {
                valueInputHtml = `<textarea class="form-control form-control-sm block-value" placeholder="Default value" rows="2" style="min-height: 80px;">${escapeHtml(field.defaultValue || '')}</textarea>`;
            } else if (field.type === 'checkbox') {
                // Single checkbox - default value is true/false
                const isChecked = field.defaultValue === true || field.defaultValue === 'true';
                valueInputHtml = `
                    <div class="form-check pt-1">
                        <input type="checkbox" class="form-check-input block-value-checkbox" ${isChecked ? 'checked' : ''}>
                        <label class="form-check-label small text-muted">Default: checked</label>
                    </div>`;
            } else {
                valueInputHtml = `<input type="text" class="form-control form-control-sm block-value" placeholder="Default value" value="${escapeHtml(field.defaultValue || '')}">`;
            }

            inputRow.innerHTML = `
                <span class="drag-handle pt-1" title="Drag to reorder" style="cursor: grab; opacity: 0.5;"><i class="fa-solid fa-grip-lines"></i></span>
                <input type="text" class="form-control form-control-sm block-key" style="flex: 0 0 200px; font-weight: 500;" placeholder="Key" value="${escapeHtml(field.key || '')}">
                <select class="form-select form-select-sm block-type" style="flex: 0 0 120px;">
                    <option value="text" ${field.type === 'text' ? 'selected' : ''}>Short Text</option>
                    <option value="textarea" ${field.type === 'textarea' ? 'selected' : ''}>Long Text</option>
                    <option value="select" ${field.type === 'select' ? 'selected' : ''}>Select</option>
                    <option value="multiselect" ${field.type === 'multiselect' ? 'selected' : ''}>Multi Select</option>
                    <option value="checkbox" ${field.type === 'checkbox' ? 'selected' : ''}>Checkbox</option>
                    <option value="radio" ${field.type === 'radio' ? 'selected' : ''}>Radio Group</option>
                    <option value="checkboxList" ${field.type === 'checkboxList' ? 'selected' : ''}>Checkbox List</option>
                </select>
                <div class="flex-grow-1 value-container">
                    ${valueInputHtml}
                </div>
                <button type="button" class="btn btn-sm btn-outline-secondary btn-settings ${!needsLengthValidation(field.type) && !needsCountValidation(field.type) ? 'disabled' : ''}" title="Settings" ${!needsLengthValidation(field.type) && !needsCountValidation(field.type) ? 'disabled' : ''}>
                    <i class="fa-solid fa-gear"></i>
                </button>
                <button type="button" class="btn btn-delete text-danger bg-transparent border-0 p-1" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
            `;

            // Bind events for main row
            inputRow.querySelector('.block-key').addEventListener('input', (e) => {
                updateFieldInMasterJson(field.id, 'key', e.target.value);
                validateDuplicateKeys();
            });

            inputRow.querySelector('.block-type').addEventListener('change', (e) => {
                const newType = e.target.value;
                updateFieldInMasterJson(field.id, 'type', newType);
                
                // Update default validation based on type
                if (!field.validation) field.validation = {};
                
                // Reset/Set defaults
                if (newType === 'text') {
                    field.validation.maxLength = 64;
                    delete field.validation.minCount;
                    delete field.validation.maxCount;
                } else if (newType === 'textarea') {
                    field.validation.maxLength = 255;
                    delete field.validation.minCount;
                    delete field.validation.maxCount;
                } else if (needsCountValidation(newType)) {
                    // For multiselect/checkboxList - set default minCount=1
                    delete field.validation.minLength;
                    delete field.validation.maxLength;
                    if (field.validation.minCount === undefined) {
                        field.validation.minCount = 1;
                    }
                } else {
                    // Remove length validation for others (select, radio, checkbox)
                    delete field.validation.minLength;
                    delete field.validation.maxLength;
                    delete field.validation.minCount;
                    delete field.validation.maxCount;
                }
                
                // Re-render row to switch input/textarea and update settings
                renderMainRow();
                
                // Update settings inputs manually since renderMainRow re-creates the settings div but inputs are bound to old values?
                // Wait, renderMainRow does NOT re-create settingsDiv. settingsDiv is created once outside renderMainRow.
                // So I need to update the inputs in settingsDiv.
                const minLenInput = settingsDiv.querySelector('.setting-min-length');
                const maxLenInput = settingsDiv.querySelector('.setting-max-length');
                const minCountInput = settingsDiv.querySelector('.setting-min-count');
                const maxCountInput = settingsDiv.querySelector('.setting-max-count');
                if (minLenInput) minLenInput.value = field.validation.minLength ?? '';
                if (maxLenInput) maxLenInput.value = field.validation.maxLength ?? '';
                if (minCountInput) minCountInput.value = field.validation.minCount ?? '';
                if (maxCountInput) maxCountInput.value = field.validation.maxCount ?? '';

                // Initialize options array if switching to options type
                if (needsOptions(newType) && (!field.options || field.options.length === 0)) {
                    field.options = ['Option 1'];
                    updateFieldInMasterJson(field.id, 'options', field.options);
                }
            });

            // Bind value input events based on type
            if (showOptionsEditor) {
                // Render options editor
                const optionsContainer = inputRow.querySelector('.options-editor-container');
                if (optionsContainer) {
                    renderOptionsEditor(field, optionsContainer);
                }
            } else if (field.type === 'checkbox') {
                // Single checkbox
                const checkboxInput = inputRow.querySelector('.block-value-checkbox');
                if (checkboxInput) {
                    checkboxInput.addEventListener('change', (e) => {
                        updateFieldInMasterJson(field.id, 'defaultValue', e.target.checked);
                    });
                }
            } else {
                // Text/textarea
                const valueInput = inputRow.querySelector('.block-value');
                if (valueInput) {
                    valueInput.addEventListener('input', (e) => {
                        updateFieldInMasterJson(field.id, 'defaultValue', e.target.value);
                    });
                }
            }

            inputRow.querySelector('.btn-delete').addEventListener('click', () => {
                removeFieldFromMasterJson(field.id);
                wrapper.remove();
                updateEmptyState();
            });
            
            inputRow.querySelector('.btn-settings').addEventListener('click', () => {
                settingsDiv.classList.toggle('d-none');
            });
        }
        
        // Initial render of main row
        renderMainRow();
        
        // Bind events for settings
        settingsDiv.querySelector('.setting-min-length').addEventListener('input', (e) => {
            if (!field.validation) field.validation = {};
            field.validation.minLength = e.target.value ? parseInt(e.target.value) : undefined;
        });

        settingsDiv.querySelector('.setting-max-length').addEventListener('input', (e) => {
            if (!field.validation) field.validation = {};
            field.validation.maxLength = e.target.value ? parseInt(e.target.value) : undefined;
        });

        settingsDiv.querySelector('.setting-min-count').addEventListener('input', (e) => {
            if (!field.validation) field.validation = {};
            field.validation.minCount = e.target.value ? parseInt(e.target.value) : undefined;
        });

        settingsDiv.querySelector('.setting-max-count').addEventListener('input', (e) => {
            if (!field.validation) field.validation = {};
            field.validation.maxCount = e.target.value ? parseInt(e.target.value) : undefined;
        });

        div.appendChild(inputRow);
        div.appendChild(settingsDiv);
        wrapper.appendChild(div);

        return wrapper;
    }

    function createSectionElement(field) {
        const div = document.createElement('div');
        div.className = 'json-section';
        div.dataset.id = field.id;
        div.dataset.type = 'section';

        div.innerHTML = `
            <div class="section-header d-flex align-items-center">
                <span class="drag-handle me-2" title="Drag to reorder"><i class="fa-solid fa-grip-lines"></i></span>
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
            const newField = { 
                id: generateId(), 
                type: 'text', 
                key: '', 
                defaultValue: '', 
                validation: { minLength: 0, maxLength: 64 } 
            };
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
        const allBlocks = jsonBlocksContainer.querySelectorAll('.json-block-wrapper, .json-section');
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
                        // Mark the inner block for wrappers, or the section itself
                        const target1 = block.querySelector('.json-block') || block;
                        target1.classList.add('is-invalid');
                        
                        const otherBlock = keyMap.get(scopeKey);
                        const target2 = otherBlock.querySelector('.json-block') || otherBlock;
                        target2.classList.add('is-invalid');
                    } else {
                        keyMap.set(scopeKey, block);
                        const target = block.querySelector('.json-block') || block;
                        target.classList.remove('is-invalid');
                    }
                } else {
                    const target = block.querySelector('.json-block') || block;
                    target.classList.remove('is-invalid');
                }
            }
        });
    }

    // ===== ROOT LEVEL ADD BUTTONS =====
    if (addKeyValueBtn) {
        addKeyValueBtn.addEventListener('click', () => {
            const newField = { 
                id: generateId(), 
                type: 'text', 
                key: '', 
                defaultValue: '', 
                validation: { minLength: 0, maxLength: 64 } 
            };
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
                const isCollapsed = field.collapsed === true;
                
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
                collapseEl.addEventListener('show.bs.collapse', () => chevron.style.transform = 'rotate(0deg)');
                collapseEl.addEventListener('hide.bs.collapse', () => chevron.style.transform = 'rotate(-90deg)');
                if (isCollapsed) chevron.style.transform = 'rotate(-90deg)';

                const body = section.querySelector('.card-body');
                if (field.children && field.children.length > 0) {
                    renderUseFields(field.children, body);
                }
                container.appendChild(section);
            } else {
                const formGroup = document.createElement('div');
                formGroup.className = 'row mb-3 align-items-start';
                
                const label = document.createElement('label');
                label.className = 'col-md-3 col-form-label col-form-label-sm';
                label.textContent = field.key || 'Unnamed';
                
                const inputCol = document.createElement('div');
                inputCol.className = 'col-md-9 position-relative';
                
                let inputHtml = '';
                const options = field.options || [];
                
                switch(field.type) {
                    case 'textarea':
                        inputHtml = `<textarea class="form-control form-control-sm use-field" data-id="${field.id}" rows="3">${escapeHtml(field.defaultValue || '')}</textarea>`;
                        break;
                    case 'select':
                        inputHtml = `<select class="form-select form-select-sm use-field" data-id="${field.id}">
                            <option value="">-- Select option --</option>
                            ${options.map(opt => `<option value="${escapeHtml(opt)}" ${field.defaultValue === opt ? 'selected' : ''}>${escapeHtml(opt)}</option>`).join('')}
                        </select>`;
                        break;
                    case 'multiselect':
                        inputHtml = `<select class="form-select form-select-sm use-field choices-init" data-id="${field.id}" multiple>
                            ${options.map(opt => `<option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>`).join('')}
                        </select>`;
                        break;
                    case 'checkbox':
                        inputHtml = `
                            <div class="form-check pt-1">
                                <input class="form-check-input use-field" type="checkbox" data-id="${field.id}" id="check_${field.id}" ${field.defaultValue === 'true' || field.defaultValue === true ? 'checked' : ''}>
                                <label class="form-check-label small" for="check_${field.id}">Enabled</label>
                            </div>`;
                        break;
                    case 'radio':
                        inputHtml = `<div class="pt-1">
                            ${options.map((opt, i) => `
                                <div class="form-check form-check-inline">
                                    <input class="form-check-input use-field" type="radio" name="radio_${field.id}" data-id="${field.id}" id="radio_${field.id}_${i}" value="${escapeHtml(opt)}" ${field.defaultValue === opt ? 'checked' : ''}>
                                    <label class="form-check-label small" for="radio_${field.id}_${i}">${escapeHtml(opt)}</label>
                                </div>
                            `).join('')}
                        </div>`;
                        break;
                    case 'checkboxList':
                        inputHtml = `<div class="pt-1">
                            ${options.map((opt, i) => `
                                <div class="form-check">
                                    <input class="form-check-input use-field" type="checkbox" data-id="${field.id}" id="checkList_${field.id}_${i}" value="${escapeHtml(opt)}">
                                    <label class="form-check-label small" for="checkList_${field.id}_${i}">${escapeHtml(opt)}</label>
                                </div>
                            `).join('')}
                        </div>`;
                        break;
                    default: // text
                        inputHtml = `<input type="text" class="form-control form-control-sm use-field" data-id="${field.id}" value="${escapeHtml(field.defaultValue || '')}">`;
                }
                
                inputCol.innerHTML = inputHtml + `<div class="invalid-feedback"></div>`;
                formGroup.appendChild(label);
                formGroup.appendChild(inputCol);
                container.appendChild(formGroup);
                
                // Initialize Choices.js for multiselect
                if (field.type === 'multiselect' && typeof Choices !== 'undefined') {
                    const el = inputCol.querySelector('.choices-init');
                    new Choices(el, {
                        removeItemButton: true,
                        placeholderValue: 'Select options',
                        searchPlaceholderValue: 'Search...'
                    });
                    el.addEventListener('change', () => {
                        updateOutputJson();
                        validateUseField(el, field);
                    });
                }

                // Add event listeners to all inputs in this group
                const inputs = inputCol.querySelectorAll('.use-field');
                inputs.forEach(input => {
                    input.addEventListener('input', () => {
                        updateOutputJson();
                        validateUseField(input, field);
                    });
                    input.addEventListener('change', () => {
                        updateOutputJson();
                        validateUseField(input, field);
                    });
                    // Initial validation
                    validateUseField(input, field);
                });
            }
        });
    }

    function updateOutputJson() {
        const showOnlyValid = onlyValidJsonToggle ? onlyValidJsonToggle.checked : true;
        const validation = validateAllUseFields();
        
        if (showOnlyValid && !validation.isValid) {
            const errorMsg = "Validation Errors:\n\n" + validation.errors.join('\n');
            if (outputJsonEditor) {
                outputJsonEditor.setValue(errorMsg);
            }
            return;
        }

        const output = buildFinalJson(masterJson.fields);
        if (outputJsonEditor) {
            outputJsonEditor.setValue(JSON.stringify(output, null, 2));
        }
    }
    
    if (onlyValidJsonToggle) {
        onlyValidJsonToggle.addEventListener('change', updateOutputJson);
    }

    function buildFinalJson(fields) {
        const result = {};

        fields.forEach(field => {
            if (field.type === 'section') {
                if (field.key) {
                    result[field.key] = buildFinalJson(field.children || []);
                }
            } else if (field.key) {
                result[field.key] = getFieldValue(field);
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

    // ===== URL STATE MANAGEMENT =====
    function getUrlParams() {
        const params = new URLSearchParams(window.location.search);
        return params.get('data');
    }

    function setUrlParams(data) {
        const url = new URL(window.location);
        url.searchParams.set('data', data);
        window.history.pushState({}, '', url);
    }

    function loadFromUrl() {
        const data = getUrlParams();
        if (data) {
            try {
                const jsonStr = atob(data);
                masterJson = JSON.parse(jsonStr);
                renderEditMode();
                
                // If data is loaded, maybe switch to USE mode or just stay ready
                // Let's stay in EDIT mode but show it's populated
            } catch (e) {
                console.error('Failed to load from URL', e);
            }
        }
    }

    // ===== SHARE & AI ACTIONS =====
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            const jsonStr = JSON.stringify(masterJson);
            const base64 = btoa(jsonStr);
            setUrlParams(base64);
            
            navigator.clipboard.writeText(window.location.href).then(() => {
                const originalText = shareBtn.textContent;
                shareBtn.textContent = 'Link Copied!';
                setTimeout(() => {
                    shareBtn.textContent = originalText;
                }, 2000);
            });
        });
    }

    function generateAiPrompt() {
        const outputJson = buildFinalJson(masterJson.fields);
        const jsonStr = JSON.stringify(outputJson, null, 2);
        
        return `\`\`\`json\n${jsonStr}\n\`\`\``;
    }

    if (openChatGptBtn) {
        openChatGptBtn.addEventListener('click', () => {
            const prompt = generateAiPrompt();
            const url = `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`;
            window.open(url, '_blank');
        });
    }

    if (openGeminiBtn) {
        openGeminiBtn.addEventListener('click', () => {
            const prompt = generateAiPrompt();
            const url = `https://gemini.google.com/app?text=${encodeURIComponent(prompt)}`;
            window.open(url, '_blank');
        });
    }

    // Initialize root sortable on load
    initRootSortable();
    
    // Load state from URL if present
    loadFromUrl();
});
