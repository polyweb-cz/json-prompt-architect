// Initialize Choices.js on the select element
document.addEventListener('DOMContentLoaded', function() {
    const choicesSelect = new Choices('#choicesSelect', {
        removeItemButton: true,
        searchEnabled: true,
        placeholder: true,
        placeholderValue: 'Vyberte programovací jazyky'
    });
    
    // Sidebar toggle functionality
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    
    function toggleSidebar() {
        sidebar.classList.toggle('show');
        sidebarOverlay.classList.toggle('show');
    }
    
    menuToggle.addEventListener('click', toggleSidebar);
    sidebarOverlay.addEventListener('click', toggleSidebar);
});
