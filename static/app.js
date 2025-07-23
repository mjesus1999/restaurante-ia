// ===== CONFIGURACIÓN =====
const API_BASE_URL = '';

// ===== ESTADO GLOBAL =====
let platillos = [];
let recomendaciones = [];
let currentFilters = {
    categoria: 'todos',
    presupuesto: 50
};

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    try {
        await loadPlatillos();
        setupEventListeners();
        updateMenuStats();
        updateBudgetAvailable();
    } catch (error) {
        console.error('Error inicializando la aplicación:', error);
        showError('Error al cargar los datos. Por favor, recarga la página.');
    }
}

// ===== CARGA DE DATOS =====
async function loadPlatillos() {
    try {
        // Agregar timestamp para evitar caché
        const timestamp = new Date().getTime();
        const response = await fetch(`${API_BASE_URL}/api/platillos?t=${timestamp}`);
        if (!response.ok) throw new Error('Error al cargar platillos');
        
        const data = await response.json();
        platillos = data.platillos;
        console.log('Platillos cargados:', platillos); // <-- Depuración
        renderMenuGrid();
        updateMenuStats();
    } catch (error) {
        console.error('Error cargando platillos:', error);
        throw error;
    }
}

// ===== RENDERIZADO DEL MENÚ =====
function renderMenuGrid() {
    const menuGrid = document.getElementById('menu-grid');
    if (!menuGrid) return;

    const filteredPlatillos = filterPlatillosByCategory(platillos, currentFilters.categoria);
    
    menuGrid.innerHTML = filteredPlatillos.map(platillo => `
        <div class="menu-item" data-id="${platillo.nombre}" data-categoria="${platillo.categoria}">
            <img src="${platillo.imagen}" alt="${platillo.nombre}" onerror="this.onerror=null;this.src='https://via.placeholder.com/300x200?text=Imagen+no+disponible';">
            <h3>${platillo.nombre}</h3>
            <p>${platillo.descripcion}</p>
            <div class="menu-item-footer">
                <span class="price">S/ ${platillo.precio}</span>
                <div class="menu-tags">
                    <span class="tag">${platillo.categoria}</span>
                    ${platillo.calorias ? `<span class="tag">${platillo.calorias} cal</span>` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

function filterPlatillosByCategory(platillos, categoria) {
    if (categoria === 'todos') return platillos;
    return platillos.filter(platillo => platillo.categoria === categoria);
}

// ===== FILTROS DEL MENÚ =====
function setupMenuFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            const categoria = this.dataset.categoria;
            
            // Actualizar estado activo
            filterButtons.forEach(btn => {
                btn.classList.remove('active');
                btn.setAttribute('aria-pressed', 'false');
            });
            
            this.classList.add('active');
            this.setAttribute('aria-pressed', 'true');
            
            // Actualizar filtros y renderizar
            currentFilters.categoria = categoria;
            renderMenuGrid();
        });
    });
}

// ===== FORMULARIO DE PREFERENCIAS =====
function setupPreferencesForm() {
    const form = document.getElementById('preferences-form');
    const budgetSlider = document.getElementById('budget-slider');
    const budgetValue = document.getElementById('budget-value');
    const budgetAvailable = document.getElementById('budget-available');
    
    // Slider de presupuesto
    if (budgetSlider) {
        budgetSlider.addEventListener('input', function() {
            const value = this.value;
            budgetValue.textContent = `S/ ${value}`;
            currentFilters.presupuesto = parseInt(value);
            updateBudgetAvailable();
        });
    }
    
    // Envío del formulario
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            await getRecommendations();
        });
    }
}

// ===== RECOMENDACIONES =====
async function getRecommendations() {
    const form = document.getElementById('preferences-form');
    const resultsArea = document.getElementById('results-area');
    
    if (!form || !resultsArea) return;
    
    // Mostrar loading
    showLoading(resultsArea);
    
    try {
        // Recopilar datos del formulario
        const formData = new FormData(form);
        const preferences = {
            preferencias_culturales: formData.getAll('preferencias_culturales'),
            estado_animo: formData.get('estado_animo'),
            presupuesto: parseInt(formData.get('presupuesto')),
            etiquetas_nutricionales: formData.getAll('etiquetas_nutricionales')
        };
        
        // Llamar a la API
        const response = await fetch(`${API_BASE_URL}/api/recomendar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(preferences)
        });
        
        if (!response.ok) throw new Error('Error al obtener recomendaciones');
        
        const data = await response.json();
        recomendaciones = data.recomendaciones;
        
        // Renderizar resultados
        renderRecommendations(recomendaciones);
        
        // Resaltar platillos recomendados en el menú
        highlightRecommendedPlatillos(recomendaciones);
        
        // Scroll suave a resultados
        resultsArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
    } catch (error) {
        console.error('Error obteniendo recomendaciones:', error);
        showNoResults(resultsArea, 'Error al obtener recomendaciones. Intenta de nuevo.');
    }
}

function renderRecommendations(recomendaciones) {
    const resultsArea = document.getElementById('results-area');
    if (!resultsArea) return;
    
    if (recomendaciones.length === 0) {
        showNoResults(resultsArea);
        return;
    }
    
    resultsArea.innerHTML = `
        <div class="results-header">
            <h3>Recomendaciones para ti</h3>
            <span class="results-count">${recomendaciones.length} platillo${recomendaciones.length > 1 ? 's' : ''} encontrado${recomendaciones.length > 1 ? 's' : ''}</span>
        </div>
        <div class="results-grid">
            ${recomendaciones.map(platillo => `
                <div class="result-card" data-id="${platillo.nombre}">
                    <img src="${platillo.imagen}" alt="${platillo.nombre}" loading="lazy">
                    <h3>${platillo.nombre}</h3>
                    <p>${platillo.descripcion}</p>
                    <div class="result-tags">
                        <span class="tag highlight">${platillo.categoria}</span>
                        <span class="tag">S/ ${platillo.precio}</span>
                        ${platillo.calorias ? `<span class="tag">${platillo.calorias} cal</span>` : ''}
                        ${platillo.tiempo_preparacion ? `<span class="tag">${platillo.tiempo_preparacion} min</span>` : ''}
                    </div>
                    ${platillo.ingredientes ? `
                        <div class="ingredientes">
                            <strong>Ingredientes:</strong> ${platillo.ingredientes.join(', ')}
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>
    `;
}

function highlightRecommendedPlatillos(recomendaciones) {
    // Remover highlights previos
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('highlighted');
    });
    
    // Aplicar highlights a platillos recomendados
    recomendaciones.forEach(platillo => {
        const menuItem = document.querySelector(`.menu-item[data-id="${platillo.nombre}"]`);
        if (menuItem) {
            menuItem.classList.add('highlighted');
        }
    });
}

// ===== RECONOCIMIENTO DE VOZ =====
function setupVoiceRecognition() {
    const voiceBtn = document.getElementById('voice-btn');
    if (!voiceBtn) return;
    
    // Verificar si el navegador soporta reconocimiento de voz
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        voiceBtn.disabled = true;
        voiceBtn.title = 'Reconocimiento de voz no disponible en este navegador';
        return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = false;
    
    voiceBtn.addEventListener('click', function() {
        if (recognition.start) {
            recognition.start();
            voiceBtn.classList.add('listening');
            voiceBtn.innerHTML = '<i class="fa-solid fa-stop" aria-hidden="true"></i>';
        }
    });
    
    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript.toLowerCase();
        processVoiceCommand(transcript);
        
        voiceBtn.classList.remove('listening');
        voiceBtn.innerHTML = '<i class="fa-solid fa-microphone" aria-hidden="true"></i>';
    };
    
    recognition.onerror = function(event) {
        console.error('Error en reconocimiento de voz:', event.error);
        voiceBtn.classList.remove('listening');
        voiceBtn.innerHTML = '<i class="fa-solid fa-microphone" aria-hidden="true"></i>';
    };
    
    recognition.onend = function() {
        voiceBtn.classList.remove('listening');
        voiceBtn.innerHTML = '<i class="fa-solid fa-microphone" aria-hidden="true"></i>';
    };
}

function processVoiceCommand(transcript) {
    console.log('Comando de voz:', transcript);
    
    // Comandos básicos
    if (transcript.includes('vegetariano') || transcript.includes('vegetariana')) {
        toggleCheckbox('vegetariano');
    } else if (transcript.includes('vegano') || transcript.includes('vegana')) {
        toggleCheckbox('vegano');
    } else if (transcript.includes('sin cerdo')) {
        toggleCheckbox('sin_cerdo');
    } else if (transcript.includes('sin mariscos')) {
        toggleCheckbox('sin_mariscos');
    } else if (transcript.includes('ligero') || transcript.includes('ligera')) {
        setSelectValue('estado_animo', 'ligero');
    } else if (transcript.includes('energía') || transcript.includes('energia')) {
        setSelectValue('estado_animo', 'energia');
    } else if (transcript.includes('recomienda') || transcript.includes('recomiéndame')) {
        document.getElementById('recommend-btn').click();
    }
    
    // Feedback visual
    showVoiceFeedback(transcript);
}

function toggleCheckbox(value) {
    const checkbox = document.querySelector(`input[value="${value}"]`);
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change'));
    }
}

function setSelectValue(name, value) {
    const select = document.querySelector(`select[name="${name}"]`);
    if (select) {
        select.value = value;
        select.dispatchEvent(new Event('change'));
    }
}

function showVoiceFeedback(transcript) {
    // Crear notificación temporal
    const notification = document.createElement('div');
    notification.className = 'voice-feedback';
    notification.textContent = `Comando reconocido: "${transcript}"`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--color-accent);
        color: white;
        padding: 1rem;
        border-radius: 8px;
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// ===== UTILIDADES =====
function updateMenuStats() {
    const totalPlatillos = document.getElementById('total-platillos');
    const tiempoPromedio = document.getElementById('tiempo-promedio');
    
    if (totalPlatillos) {
        totalPlatillos.textContent = platillos.length;
    }
    
    if (tiempoPromedio && platillos.length > 0) {
        const promedio = Math.round(
            platillos.reduce((sum, p) => sum + (p.tiempo_preparacion || 0), 0) / platillos.length
        );
        tiempoPromedio.textContent = promedio;
    }
}

function updateBudgetAvailable() {
    const budgetAvailable = document.getElementById('budget-available');
    if (!budgetAvailable) return;
    
    const disponibles = platillos.filter(p => p.precio <= currentFilters.presupuesto).length;
    budgetAvailable.textContent = `${disponibles} platillo${disponibles !== 1 ? 's' : ''} disponible${disponibles !== 1 ? 's' : ''}`;
}

function showLoading(container) {
    container.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Buscando recomendaciones...</p>
        </div>
    `;
}

function showNoResults(container, message = 'No se encontraron recomendaciones para tus filtros.') {
    container.innerHTML = `
        <div class="no-results">
            <i class="fa-solid fa-search" aria-hidden="true"></i>
            <h3>Sin resultados</h3>
            <p>${message}</p>
            <button class="btn btn-primary" onclick="resetFilters()">
                <i class="fa-solid fa-rotate-left" aria-hidden="true"></i>
                Reiniciar filtros
            </button>
        </div>
    `;
}

function showError(message) {
    const notification = document.createElement('div');
    notification.className = 'error-notification';
    notification.innerHTML = `
        <i class="fa-solid fa-exclamation-triangle" aria-hidden="true"></i>
        <span>${message}</span>
    `;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--color-error);
        color: white;
        padding: 1rem 2rem;
        border-radius: 8px;
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

function resetFilters() {
    const form = document.getElementById('preferences-form');
    if (form) {
        form.reset();
        currentFilters.presupuesto = 50;
        document.getElementById('budget-value').textContent = 'S/ 50';
        updateBudgetAvailable();
        
        // Remover highlights
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('highlighted');
        });
        
        // Limpiar resultados
        const resultsArea = document.getElementById('results-area');
        if (resultsArea) {
            resultsArea.innerHTML = '';
        }
    }
}

// ===== CONFIGURACIÓN DE EVENT LISTENERS =====
function setupEventListeners() {
    setupMenuFilters();
    setupPreferencesForm();
    setupVoiceRecognition();
    
    // Actualizar contador de platillos disponibles cuando cambie el presupuesto
    const budgetSlider = document.getElementById('budget-slider');
    if (budgetSlider) {
        budgetSlider.addEventListener('input', updateBudgetAvailable);
    }
}

// ===== ANIMACIONES CSS =====
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(-50%) translateY(-100%);
            opacity: 0;
        }
        to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
    }
    
    .voice-feedback {
        animation: slideIn 0.3s ease;
    }
    
    .btn.listening {
        background: var(--color-accent) !important;
        animation: pulse 1s infinite;
    }
    
    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
    }
`;
document.head.appendChild(style); 
