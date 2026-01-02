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
    const jsonPromptInput = document.getElementById('jsonPromptInput');
    const jsonPromptError = document.getElementById('jsonPromptError');
    const saveJsonPrompt = document.getElementById('saveJsonPrompt');
    const addJsonButton = document.getElementById('addJsonButton');

    let ajv = null;
    let schemaValidator = null;

    if (typeof Ajv !== 'undefined') {
        ajv = new Ajv({ allErrors: true, strict: false });
        schemaValidator = ajv.compile(true);
    }

    function setJsonPromptValidity(isValid, message) {
        if (!jsonPromptInput || !jsonPromptError || !saveJsonPrompt) {
            return;
        }
        jsonPromptInput.classList.toggle('is-invalid', !isValid);
        jsonPromptError.classList.toggle('d-none', isValid);
        if (!isValid) {
            jsonPromptError.textContent = message || 'Invalid JSON.';
        }
        saveJsonPrompt.disabled = !isValid;
    }

    function validateJsonPrompt() {
        if (!jsonPromptInput) {
            return false;
        }

        const value = jsonPromptInput.value.trim();
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
            setJsonPromptValidity(false, 'JSON is invalid. Check commas, quotes, and braces.');
            return false;
        }

        setJsonPromptValidity(true, '');
        return true;
    }

    if (jsonPromptInput) {
        jsonPromptInput.addEventListener('input', validateJsonPrompt);
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
            if (jsonPromptInput) {
                jsonPromptInput.value = '';
            }
            setJsonPromptValidity(false, 'JSON is required.');
        });
    }

    if (addJsonButton) {
        addJsonButton.addEventListener('click', () => {
            setJsonPromptValidity(false, 'JSON is required.');
        });
    }
});
