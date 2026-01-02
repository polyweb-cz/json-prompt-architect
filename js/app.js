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
    
    // Check if all required elements exist
    if (!menuToggle || !sidebar || !sidebarOverlay) {
        console.error('Required elements for sidebar not found');
        return;
    }
    
    function toggleSidebar() {
        const isExpanded = sidebar.classList.toggle('show');
        sidebarOverlay.classList.toggle('show');
        menuToggle.setAttribute('aria-expanded', isExpanded);
    }
    
    menuToggle.addEventListener('click', toggleSidebar);
    sidebarOverlay.addEventListener('click', toggleSidebar);
});
