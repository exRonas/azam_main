let currentSessionId = null;

const storyLog = document.getElementById('story-log');
const controls = document.getElementById('controls');
const choiceInput = document.getElementById('choice-input');
const sendBtn = document.getElementById('send-btn');

const profilePanel = document.getElementById('profile-panel');
const valuesList = document.getElementById('values-list');
const problemsList = document.getElementById('problems-list');

// Функция для добавления текста в лог
function appendText(text, type = 'narrator') {
    const p = document.createElement('div');
    p.className = `message ${type}`;
    
    // Обработка переносов строк
    p.innerHTML = text.replace(/\n/g, '<br>');
    
    storyLog.appendChild(p);
    storyLog.scrollTop = storyLog.scrollHeight;
}

// Словари для отображения названий
const STAT_NAMES = {
    independence_patriotism: "Независимость и патриотизм",
    unity_solidarity: "Единство и солидарность",
    justice_responsibility: "Справедливость и ответственность",
    law_order: "Закон и порядок",
    hardwork_professionalism: "Трудолюбие и профессионализм",
    creativity_innovation: "Созидание и новаторство",
    
    drug_addiction: "Наркомания",
    gambling_addiction: "Лудомания",
    vandalism: "Вандализм",
    religious_extremism: "Религиозный экстремизм",
    bullying: "Буллинг",
    violence: "Насилие",
    wastefulness: "Расточительство"
};

// --- Burger & mobile drawer: глобальная инициализация ---
document.addEventListener('DOMContentLoaded', () => {
    const burgerBtn = document.getElementById('burger-btn');
    const drawer = document.getElementById('mobile-drawer');
    const drawerClose = document.getElementById('drawer-close');
    const drawerBackdrop = document.getElementById('drawer-backdrop');

    function openDrawer() {
        if (!drawer || !burgerBtn) return;
        drawer.classList.add('open');
        burgerBtn.setAttribute('aria-expanded', 'true');
    }

    function closeDrawer() {
        if (!drawer || !burgerBtn) return;
        drawer.classList.remove('open');
        burgerBtn.setAttribute('aria-expanded', 'false');
    }

    if (burgerBtn) burgerBtn.addEventListener('click', openDrawer);
    if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
    if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeDrawer);
});

// Duplicate stats helpers (глобально)
function renderStatItem(container, label, value) {
    const item = document.createElement('div');
    item.className = 'stat-item';
    const labelDiv = document.createElement('div');
    labelDiv.className = 'stat-label';
    labelDiv.innerHTML = `<span>${label}</span><span>${value}%</span>`;
    const barBg = document.createElement('div');
    barBg.className = 'stat-bar-bg';
    const barFill = document.createElement('div');
    barFill.className = 'stat-bar-fill';
    barFill.style.width = `${value}%`;
    barBg.appendChild(barFill);
    item.appendChild(labelDiv);
    item.appendChild(barBg);
    container.appendChild(item);
}

function updateStatsMobile(stats) {
    const valuesMobile = document.getElementById('values-list-mobile');
    const problemsMobile = document.getElementById('problems-list-mobile');
    if (!valuesMobile || !problemsMobile) return;

    valuesMobile.innerHTML = '';
    problemsMobile.innerHTML = '';

    // Values
    renderStatItem(valuesMobile, 'Независимость и патриотизм', stats.independence_patriotism || 0);
    renderStatItem(valuesMobile, 'Единство и солидарность', stats.unity_solidarity || 0);
    renderStatItem(valuesMobile, 'Справедливость и ответственность', stats.justice_responsibility || 0);
    renderStatItem(valuesMobile, 'Закон и порядок', stats.law_order || 0);
    renderStatItem(valuesMobile, 'Трудолюбие и профессионализм', stats.hardwork_professionalism || 0);
    renderStatItem(valuesMobile, 'Созидание и новаторство', stats.creativity_innovation || 0);

    // Problems
    renderStatItem(problemsMobile, 'Наркомания', stats.drug_addiction || 0);
    renderStatItem(problemsMobile, 'Лудомания', stats.gambling_addiction || 0);
    renderStatItem(problemsMobile, 'Вандализм', stats.vandalism || 0);
    renderStatItem(problemsMobile, 'Религиозный экстремизм', stats.religious_extremism || 0);
    renderStatItem(problemsMobile, 'Буллинг', stats.bullying || 0);
    renderStatItem(problemsMobile, 'Насилие', stats.violence || 0);
    renderStatItem(problemsMobile, 'Расточительство', stats.wastefulness || 0);
}

// Функция обновления UI статистики
function updateStats(stats) {
    if (!stats) return;

    profilePanel.classList.remove('hidden');
    valuesList.innerHTML = '';
    problemsList.innerHTML = '';

        // Burger & mobile drawer logic (инициализируется глобально)

        // Duplicate stats into mobile drawer
        function renderStatItem(container, label, value) {
            const item = document.createElement('div');
            item.className = 'stat-item';
            const labelDiv = document.createElement('div');
            labelDiv.className = 'stat-label';
            labelDiv.innerHTML = `<span>${label}</span><span>${value}%</span>`;
            const barBg = document.createElement('div');
            barBg.className = 'stat-bar-bg';
            const barFill = document.createElement('div');
            barFill.className = 'stat-bar-fill';
            barFill.style.width = `${value}%`;
            barBg.appendChild(barFill);
            item.appendChild(labelDiv);
            item.appendChild(barBg);
            container.appendChild(item);
        }

        function updateStatsMobile(stats) {
            const valuesMobile = document.getElementById('values-list-mobile');
            const problemsMobile = document.getElementById('problems-list-mobile');
            if (!valuesMobile || !problemsMobile) return;

            valuesMobile.innerHTML = '';
            problemsMobile.innerHTML = '';

            // Values
            renderStatItem(valuesMobile, 'Независимость и патриотизм', stats.independence_patriotism || 0);
            renderStatItem(valuesMobile, 'Единство и солидарность', stats.unity_solidarity || 0);
            renderStatItem(valuesMobile, 'Справедливость и ответственность', stats.justice_responsibility || 0);
            renderStatItem(valuesMobile, 'Закон и порядок', stats.law_order || 0);
            renderStatItem(valuesMobile, 'Трудолюбие и профессионализм', stats.hardwork_professionalism || 0);
            renderStatItem(valuesMobile, 'Созидание и новаторство', stats.creativity_innovation || 0);

            // Problems
            renderStatItem(problemsMobile, 'Наркомания', stats.drug_addiction || 0);
            renderStatItem(problemsMobile, 'Лудомания', stats.gambling_addiction || 0);
            renderStatItem(problemsMobile, 'Вандализм', stats.vandalism || 0);
            renderStatItem(problemsMobile, 'Религиозный экстремизм', stats.religious_extremism || 0);
            renderStatItem(problemsMobile, 'Буллинг', stats.bullying || 0);
            renderStatItem(problemsMobile, 'Насилие', stats.violence || 0);
            renderStatItem(problemsMobile, 'Расточительство', stats.wastefulness || 0);
        }

    for (const [key, value] of Object.entries(stats)) {
        const name = STAT_NAMES[key] || key;
        const isProblem = [
            'drug_addiction', 'gambling_addiction', 'vandalism', 
            'religious_extremism', 'bullying', 'violence', 'wastefulness'
        ].includes(key);

        const html = `
            <div class="stat-item">
                <div class="stat-label">
                    <span>${name}</span>
                    <span>${value}%</span>
                </div>
                <div class="stat-bar-bg">
                    <div class="stat-bar-fill" style="width: ${value}%"></div>
                </div>
            </div>
        `;

        if (isProblem) {
            problemsList.insertAdjacentHTML('beforeend', html);
        } else {
            valuesList.insertAdjacentHTML('beforeend', html);
        }
    }

    // Обновляем мобильную панель
    updateStatsMobile(stats);
}

async function startGame() {
    const usernameInput = document.getElementById('username-input');
    const ageInput = document.getElementById('age-input');
    
    const username = usernameInput.value.trim() || 'Студент';
    const age = ageInput.value ? parseInt(ageInput.value) : 0;

    try {
        const response = await fetch('/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, age })
        });

        const data = await response.json();

        if (data.sessionId) {
            currentSessionId = data.sessionId;
            
            // Очищаем экран приветствия
            storyLog.innerHTML = '';
            
            // Показываем контролы
            controls.classList.remove('hidden');
            
            // Выводим начало истории
            appendText(data.story, 'narrator');

            // Инициализируем статы (если сервер их вернул, но пока /start их не возвращает явно в JSON, 
            // но мы можем добавить или просто ждать первого хода. 
            // Лучше добавить в /start возврат stats, но пока оставим так, они появятся после первого хода или можно сделать отдельный запрос)
            // Для простоты, покажем пустые или дефолтные, если придут.
        }
    } catch (error) {
        console.error('Ошибка старта:', error);
        alert('Не удалось начать игру. Проверьте консоль.');
    }
}

async function makeChoice() {
    const choice = choiceInput.value.trim();
    if (!choice) return;

    // Блокируем интерфейс
    choiceInput.disabled = true;
    sendBtn.disabled = true;

    // Отображаем выбор игрока сразу
    appendText(choice, 'user');
    choiceInput.value = '';

    try {
        const response = await fetch('/choose', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: currentSessionId,
                user_choice: choice
            })
        });

        const data = await response.json();

        // Обновляем статистику
        if (data.stats) {
            updateStats(data.stats);
        }

        // Если игра окончена
        if (data.gameOver) {
            setTimeout(() => {
                appendText(data.response, 'narrator');
                
                // Блокируем ввод навсегда
                choiceInput.disabled = true;
                sendBtn.disabled = true;
                choiceInput.placeholder = "Игра окончена.";
                
                // Кнопка рестарта
                const restartContainer = document.createElement('div');
                restartContainer.className = 'message narrator';
                restartContainer.style.textAlign = 'center';
                
                const restartBtn = document.createElement('button');
                restartBtn.innerText = "НАЧАТЬ ЗАНОВО";
                restartBtn.className = 'restart-btn';
                restartBtn.onclick = () => location.reload();
                
                restartContainer.appendChild(restartBtn);
                storyLog.appendChild(restartContainer);
                storyLog.scrollTop = storyLog.scrollHeight;
            }, 500);
            return;
        }

        if (data.consequence && data.nextEvent) {
            // 1. Показываем последствие выбора
            setTimeout(() => {
                appendText(data.consequence, 'narrator');
                
                // Если есть маркер возраста, показываем его перед следующим событием
                if (data.ageMarker) {
                    setTimeout(() => {
                        const separator = document.createElement('div');
                        separator.className = 'date-separator';
                        separator.innerText = data.ageMarker;
                        storyLog.appendChild(separator);
                        storyLog.scrollTop = storyLog.scrollHeight;
                    }, 1000);
                }

                // 2. Показываем следующее событие с задержкой
                setTimeout(() => {
                    appendText(data.nextEvent, 'narrator');
                }, 2000); // Увеличили задержку, чтобы успеть увидеть разделитель
            }, 500);
        } else if (data.response) {
            // Обратная совместимость
            setTimeout(() => {
                appendText(data.response, 'narrator');
            }, 500);
        }

    } catch (error) {
        console.error('Ошибка выбора:', error);
        appendText('Произошла ошибка связи с сервером.', 'error');
    } finally {
        choiceInput.disabled = false;
        sendBtn.disabled = false;
        choiceInput.focus();
    }
}

// Отправка по Enter
choiceInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        makeChoice();
    }
});
