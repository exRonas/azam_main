require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./db');
const { buildPrompt } = require('./promptBuilder');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;

// Инициализация OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// --- Вспомогательные функции ---

/**
 * Генерирует продолжение истории через OpenAI API
 */
async function generateStoryContinuation(gameState, userChoice, nextLocation) {
    const prompt = buildPrompt(gameState, userChoice, nextLocation);

    try {
        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: prompt }
            ],
            model: "gpt-4o-mini", // Используем быструю и умную модель
            response_format: { type: "json_object" },
            temperature: 0.7,
        });

        const content = completion.choices[0].message.content;
        return JSON.parse(content);
    } catch (error) {
        console.error("Ошибка OpenAI:", error);
        return {
            consequence: "Вы сделали свой выбор, но туман будущего скрывает последствия (Ошибка ИИ).",
            nextEvent: "Жизнь продолжается. Что вы будете делать дальше?"
        };
    }
}

/**
 * Определяет локацию для следующего события на основе возраста
 */
function determineLocation(age) {
    const rand = Math.random();
    
    if (age < 3) {
        return "Дома (с родителями)";
    } else if (age >= 3 && age < 7) {
        // Садик или Дом (50/50)
        return rand > 0.5 ? "Детский сад" : "Дома";
    } else if (age >= 7 && age < 18) {
        // Школа, Дом, Улица
        if (rand < 0.4) return "Школа";
        if (rand < 0.7) return "Дома";
        return "На улице (с друзьями)";
    } else {
        // Взрослая жизнь
        if (rand < 0.4) return "Университет/Колледж";
        if (rand < 0.7) return "Работа/Подработка";
        return "Дома/Личная жизнь";
    }
}

// --- API Маршруты ---

// POST /start - Создание новой сессии
app.post('/start', async (req, res) => {
    try {
        const username = req.body.username || 'Guest';
        const startAge = parseInt(req.body.age) || 0;
        
        // 1. Создаем пользователя (или используем существующего, здесь упрощено)
        const userResult = await db.run('INSERT INTO users (username) VALUES (?)', [username]);
        const userId = userResult.lastID;

        // Определяем стартовую локацию
        const startLocation = determineLocation(startAge);

        // Стартовый текст игры
        let startStory;
        if (startAge === 0) {
            startStory = `Вы родились! Это был долгий путь, но вы наконец здесь.
Мир вокруг огромный, яркий и шумный. Вы лежите в кроватке, вам 0 лет.
Вы чувствуете голод и усталость, но рядом слышите голоса родителей. Они спорят, кто должен встать к вам ночью.

Как вы привлечете их внимание? (Громко заплакать? Попытаться уснуть? Издать тихий звук?)`;
        } else {
            startStory = `Вы начинаете симуляцию в возрасте ${startAge} лет.
Ваше имя ${username}.
Текущая локация: ${startLocation}.

Жизнь идет своим чередом. Что происходит вокруг вас и что вы собираетесь делать?`;
        }

        // Инициализация JSON состояния
        const initialState = {
            history: [],
            player_state: {
                age: startAge,
                events_this_year: 0,
                stats: {
                    // Ценности (0-100)
                    independence_patriotism: 10,
                    unity_solidarity: 10,
                    justice_responsibility: 10,
                    law_order: 10,
                    hardwork_professionalism: 10,
                    creativity_innovation: 10,
                    
                    // Проблемы (0-100)
                    drug_addiction: 0,
                    gambling_addiction: 0,
                    vandalism: 0,
                    religious_extremism: 0,
                    bullying: 0,
                    violence: 0,
                    wastefulness: 0
                }
            },
            world_state: {
                location: startLocation,
                time: "day"
            }
        };

        // 2. Создаем сессию
        const sessionResult = await db.run(
            'INSERT INTO sessions (user_id, story, state) VALUES (?, ?, ?)', 
            [userId, startStory, JSON.stringify(initialState)]
        );

        res.json({
            sessionId: sessionResult.lastID,
            story: startStory
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка при создании сессии' });
    }
});

// POST /choose - Обработка выбора игрока
app.post('/choose', async (req, res) => {
    try {
        const { session_id, user_choice } = req.body;

        if (!session_id || !user_choice) {
            return res.status(400).json({ error: 'Неверные данные' });
        }

        // 1. Получаем текущую историю и состояние
        const session = await db.get('SELECT story, state FROM sessions WHERE id = ?', [session_id]);
        if (!session) {
            return res.status(404).json({ error: 'Сессия не найдена' });
        }

        let gameState = {};
        try {
            gameState = JSON.parse(session.state || '{}');
        } catch (e) {
            console.error("Ошибка парсинга JSON состояния:", e);
            gameState = { history: [], player_state: {}, world_state: {} };
        }

        // --- ЛОГИКА ВОЗРАСТА ---
        // Инициализация полей, если их нет (для старых сессий)
        if (typeof gameState.player_state.age === 'undefined') gameState.player_state.age = 0;
        if (typeof gameState.player_state.events_this_year === 'undefined') gameState.player_state.events_this_year = 0;
        
        // Инициализируем лимит событий на год, если его нет
        if (typeof gameState.player_state.max_events_this_year === 'undefined') {
            gameState.player_state.max_events_this_year = 2 + Math.floor(Math.random() * 2); // 2 или 3
        }

        // Увеличиваем счетчик событий
        gameState.player_state.events_this_year++;

        let ageMarker = null;

        // Если лимит достигнут, увеличиваем возраст
        if (gameState.player_state.events_this_year >= gameState.player_state.max_events_this_year) {
            gameState.player_state.age++;
            gameState.player_state.events_this_year = 0;
            // Генерируем новый лимит на следующий год
            gameState.player_state.max_events_this_year = 2 + Math.floor(Math.random() * 2);
            ageMarker = `${gameState.player_state.age} год`; // Маркер для фронтенда
        }
        // -----------------------

        // Определяем локацию для СЛЕДУЮЩЕГО события
        const nextLocation = determineLocation(gameState.player_state.age);

        // 3. Генерируем продолжение через OpenAI
        // Передаем gameState, выбор игрока и следующую локацию
        const aiResponse = await generateStoryContinuation(gameState, user_choice, nextLocation);
        const { consequence, nextEvent, stats_change } = aiResponse;
        const fullAiResponse = `${consequence}\n\n${nextEvent}`;

        // Обновляем локацию в состоянии ПОСЛЕ генерации (чтобы она стала текущей для следующего хода)
        gameState.world_state.location = nextLocation;

        // --- ОБНОВЛЕНИЕ СТАТИСТИКИ ---
        if (stats_change) {
            if (!gameState.player_state.stats) gameState.player_state.stats = {};
            
            // Список допустимых ключей
            const ALLOWED_KEYS = [
                'independence_patriotism', 'unity_solidarity', 'justice_responsibility',
                'law_order', 'hardwork_professionalism', 'creativity_innovation',
                'drug_addiction', 'gambling_addiction', 'vandalism',
                'religious_extremism', 'bullying', 'violence', 'wastefulness'
            ];

            // Маппинг частых ошибок ИИ
            const KEY_MAPPING = {
                'hard_work_professionalism': 'hardwork_professionalism',
                'creation_innovation': 'creativity_innovation',
                'creation_and_innovation': 'creativity_innovation',
                'hard_work_and_professionalism': 'hardwork_professionalism',
                'justice_and_responsibility': 'justice_responsibility',
                'law_and_order': 'law_order',
                'unity_and_solidarity': 'unity_solidarity',
                'independence_and_patriotism': 'independence_patriotism',
                // Новые маппинги
                'work_ethic_professionalism': 'hardwork_professionalism',
                'professionalism': 'hardwork_professionalism',
                'solidarity': 'unity_solidarity',
                'responsibility': 'justice_responsibility'
            };

            for (const [rawKey, value] of Object.entries(stats_change)) {
                // Нормализация ключа
                let key = rawKey;
                if (KEY_MAPPING[key]) {
                    key = KEY_MAPPING[key];
                }

                // Пропускаем неизвестные ключи
                if (!ALLOWED_KEYS.includes(key)) {
                    console.warn(`Игнорируется неизвестный ключ статистики: ${rawKey} (-> ${key})`);
                    continue;
                }

                const currentVal = gameState.player_state.stats[key] || 0;
                let newVal = currentVal + value;
                // Ограничиваем 0-100
                if (newVal < 0) newVal = 0;
                if (newVal > 100) newVal = 100;
                
                gameState.player_state.stats[key] = newVal;
            }
        }

        // --- ПРОВЕРКА НА ПРОИГРЫШ (GAME OVER) ---
        let gameOver = false;
        let gameOverReason = "";
        const PROBLEM_KEYS = [
            'drug_addiction', 'gambling_addiction', 'vandalism',
            'religious_extremism', 'bullying', 'violence', 'wastefulness'
        ];
        
        const GAME_OVER_MESSAGES = {
            'drug_addiction': "Ваша зависимость стала фатальной. Вы потеряли всё: здоровье, семью, свободу. Финал вашей истории печален.",
            'gambling_addiction': "Долги стали неподъемными. Коллекторы забрали последнее, а вы оказались на улице без шанса на возврат.",
            'vandalism': "Ваши выходки перешли черту. Серьезное уничтожение имущества привело к огромному сроку в колонии.",
            'religious_extremism': "Ваши радикальные действия привели к трагедии. Вы арестованы спецслужбами и изолированы от общества навсегда.",
            'bullying': "Ваша жестокость привела к непоправимому. Жертва пострадала слишком сильно, и теперь вы ответите по всей строгости закона.",
            'violence': "Вспышка ярости закончилась трагедией. Вы нанесли тяжкие телесные повреждения и отправляетесь в тюрьму на долгие годы.",
            'wastefulness': "Вы промотали всё до копейки и влезли в криминальные долги. Ваша жизнь разрушена полным банкротством и нищетой."
        };

        for (const key of PROBLEM_KEYS) {
            if (gameState.player_state.stats && gameState.player_state.stats[key] >= 100) {
                gameOver = true;
                gameOverReason = GAME_OVER_MESSAGES[key] || "Вы перешли черту. Игра окончена.";
                break;
            }
        }

        // 4. Сохраняем обновленное состояние
        gameState.history.push({ role: 'user', content: user_choice });
        
        if (!gameOver) {
            gameState.history.push({ role: 'assistant', content: fullAiResponse });
        } else {
            gameState.history.push({ role: 'assistant', content: consequence + "\n\n" + gameOverReason });
        }

        await db.run('UPDATE sessions SET story = ?, state = ? WHERE id = ?', [
            JSON.stringify(gameState.history),
            JSON.stringify(gameState),
            session_id
        ]);

        // 5. Отправляем ответ
        if (gameOver) {
            res.json({
                response: consequence + "\n\n" + gameOverReason,
                consequence: consequence,
                nextEvent: gameOverReason,
                stats: gameState.player_state.stats,
                ageMarker: ageMarker,
                gameOver: true
            });
        } else {
            res.json({
                response: fullAiResponse,
                consequence: consequence,
                nextEvent: nextEvent,
                stats: gameState.player_state.stats,
                ageMarker: ageMarker
            });
        }

    } catch (error) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка обработки выбора' });
    }
});

// GET /session/:id - Получение истории
app.get('/session/:id', async (req, res) => {
    try {
        const sessionId = req.params.id;
        
        const session = await db.get('SELECT * FROM sessions WHERE id = ?', [sessionId]);
        const choices = await db.all('SELECT * FROM choices WHERE session_id = ? ORDER BY created_at ASC', [sessionId]);

        if (!session) {
            return res.status(404).json({ error: 'Сессия не найдена' });
        }

        res.json({
            session,
            choices
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка получения данных сессии' });
    }
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
    console.log(`Откройте http://localhost:${PORT} в браузере`);
});
