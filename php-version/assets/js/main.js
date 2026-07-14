/**
 * Main General Script for School Events Board
 * Handles sticky nav, scroll effects, and minor visual updates
 */

document.addEventListener('DOMContentLoaded', function() {
    // 1. Sticky Navigation Scroll Effect
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 20) {
                navbar.classList.add('scrolled');
                navbar.style.boxShadow = '0 10px 20px rgba(0, 0, 0, 0.4)';
                navbar.style.background = 'rgba(11, 11, 17, 0.95)';
            } else {
                navbar.classList.remove('scrolled');
                navbar.style.boxShadow = '';
                navbar.style.background = 'rgba(15, 15, 15, 0.8)';
            }
        });
    }

    // 2. Smooth scrolling for Anchor Links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElem = document.querySelector(targetId);
            if (targetElem) {
                e.preventDefault();
                targetElem.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // 3. Simple Card Hover Tilt Accentuation
    const cards = document.querySelectorAll('.event-card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.borderColor = 'rgba(139, 92, 246, 0.3)';
        });
        card.addEventListener('mouseleave', () => {
            card.style.borderColor = '';
        });
    });
});
