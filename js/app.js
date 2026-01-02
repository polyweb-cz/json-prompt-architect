// Initialize Choices.js on the select element
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Choices.js with error handling
    try {
        const choicesElement = document.getElementById('choicesSelect');
        if (choicesElement && typeof Choices !== 'undefined') {
            const choicesSelect = new Choices('#choicesSelect', {
                removeItemButton: true,
                searchEnabled: true,
                placeholder: true,
                placeholderValue: 'Select programming languages'
            });
        }
    } catch (error) {
        console.error('Failed to initialize Choices.js:', error);
    }
    
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
});
