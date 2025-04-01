// Mock Telegram WebApp for testing outside Telegram
const tg = window.Telegram?.WebApp || {
    expand: () => console.log("Mock Telegram WebApp expand called"),
    ready: () => console.log("Mock Telegram WebApp ready called")
};
console.log("Telegram WebApp mock initialized");
tg.expand();

// Wait for DOM to be fully loaded
console.log("Adding DOMContentLoaded listener...");
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM fully loaded, initializing app...");

    // App State
    let state = {
        rounds: 3,
        initialHoldTime: 30,
        currentRound: 1,
        breathCount: 0,
        isBreathing: false,
        isHolding: false, // Флаг для отслеживания задержки дыхания
        shouldStopAnimation: false // Флаг для прерывания анимации
    };

    // DOM Elements
    const screens = {
        home: document.getElementById('homeScreen'),
        exercise: document.getElementById('exerciseScreen'),
        completion: document.getElementById('completionScreen')
    };
    console.log("Screens initialized:", screens);

    const elements = {
        startButton: document.getElementById('startButton'),
        settingsButton: document.getElementById('settingsButton'),
        saveSettings: document.getElementById('saveSettings'),
        restartButton: document.getElementById('restartButton'),
        roundsInput: document.getElementById('rounds'),
        holdTimeInput: document.getElementById('holdTime'),
        roundsValue: document.getElementById('roundsValue'),
        holdTimeValue: document.getElementById('holdTimeValue'),
        progressRing: document.querySelector('.progress-ring__circle'),
        phase: document.getElementById('phase'),
        round: document.getElementById('round'),
        counter: document.getElementById('counter'),
        settingsModal: document.querySelector('.settings-modal'),
        modalOverlay: document.querySelector('.modal-overlay'),
        breatheInButton: document.getElementById('breatheInButton')
    };
    console.log("Elements initialized:", elements);

    // Проверка, найдены ли кнопки
    if (!elements.startButton) {
        console.error("Start button not found in DOM!");
    }
    if (!elements.settingsButton) {
        console.error("Settings button not found in DOM!");
    }
    if (!elements.breatheInButton) {
        console.error("Breathe in button not found in DOM!");
    }

    // Calculate circle circumference
    let circumference = 0; // Инициализируем circumference в глобальной области
    if (elements.progressRing) {
        const radius = elements.progressRing.r.baseVal.value;
        circumference = radius * 2 * Math.PI;
        elements.progressRing.style.strokeDasharray = `${circumference} ${circumference}`;
        elements.progressRing.style.strokeDashoffset = circumference;
        console.log("Progress ring initialized, circumference:", circumference);
    } else {
        console.error("Progress ring not found in DOM!");
    }

    function setProgress(percent) {
        if (!elements.progressRing) {
            console.error("Cannot set progress: progressRing is null");
            return;
        }
        if (!circumference) {
            console.error("Cannot set progress: circumference is not defined");
            return;
        }
        const offset = circumference - (percent / 100 * circumference);
        elements.progressRing.style.strokeDashoffset = offset;
    }

    // Event Listeners
    if (elements.startButton) {
        elements.startButton.addEventListener('click', () => {
            console.log("Start button clicked");
            startExercise();
        });
        console.log("Start button listener added");
    }
    if (elements.settingsButton) {
        elements.settingsButton.addEventListener('click', () => {
            console.log("Settings button clicked");
            showSettings();
        });
        console.log("Settings button listener added");
    }
    if (elements.saveSettings) {
        elements.saveSettings.addEventListener('click', () => {
            console.log("Save settings button clicked");
            saveSettings();
        });
        console.log("Save settings button listener added");
    }
    if (elements.restartButton) {
        elements.restartButton.addEventListener('click', () => {
            console.log("Restart button clicked");
            resetAndShowHome();
        });
        console.log("Restart button listener added");
    }
    if (elements.modalOverlay) {
        elements.modalOverlay.addEventListener('click', () => {
            console.log("Modal overlay clicked");
            hideSettings();
        });
        console.log("Modal overlay listener added");
    }
    if (elements.breatheInButton) {
        elements.breatheInButton.addEventListener('click', () => {
            console.log("Breathe in button clicked");
            state.isHolding = false; // Прерываем задержку дыхания
            state.shouldStopAnimation = true; // Прерываем анимацию прогресса
            hideBreatheInButton();
        });
        console.log("Breathe in button listener added");
    }

    // Обновление значений ползунков в реальном времени
    if (elements.roundsInput && elements.roundsValue) {
        elements.roundsInput.addEventListener('input', () => {
            elements.roundsValue.textContent = elements.roundsInput.value;
        });
        console.log("Rounds input listener added");
    }
    if (elements.holdTimeInput && elements.holdTimeValue) {
        elements.holdTimeInput.addEventListener('input', () => {
            elements.holdTimeValue.textContent = elements.holdTimeInput.value;
        });
        console.log("Hold time input listener added");
    }

    // Функция для перезапуска анимации текста
    function restartAnimation(element) {
        if (element) {
            element.style.animation = 'none';
            element.offsetHeight; // Триггерим reflow для перезапуска анимации
            element.style.animation = null;
        }
    }

    // Navigation Functions
    function showScreen(screenId) {
        console.log("Showing screen:", screenId);
        Object.values(screens).forEach(screen => {
            if (screen) {
                screen.classList.remove('active');
            }
        });
        if (screens[screenId]) {
            screens[screenId].classList.add('active');
        } else {
            console.error(`Screen ${screenId} not found!`);
        }
    }

    function showSettings() {
        console.log("Showing settings modal");
        if (elements.roundsInput && elements.holdTimeInput && elements.roundsValue && elements.holdTimeValue) {
            elements.roundsInput.value = state.rounds;
            elements.holdTimeInput.value = state.initialHoldTime;
            elements.roundsValue.textContent = state.rounds;
            elements.holdTimeValue.textContent = state.initialHoldTime;
        } else {
            console.error("Settings elements not found!");
        }
        if (elements.settingsModal && elements.modalOverlay) {
            elements.settingsModal.classList.add('active');
            elements.modalOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        } else {
            console.error("Settings modal or overlay not found!");
        }
    }

    function hideSettings() {
        console.log("Hiding settings modal");
        if (elements.settingsModal && elements.modalOverlay) {
            elements.settingsModal.classList.remove('active');
            elements.modalOverlay.classList.remove('active');
            document.body.style.overflow = 'hidden';
        } else {
            console.error("Settings modal or overlay not found!");
        }
    }

    function saveSettings() {
        console.log("Saving settings");
        if (elements.roundsInput && elements.holdTimeInput) {
            state.rounds = parseInt(elements.roundsInput.value) || 3;
            state.initialHoldTime = parseInt(elements.holdTimeInput.value) || 90;
            hideSettings();
        } else {
            console.error("Settings inputs not found!");
        }
    }

    function resetAndShowHome() {
        console.log("Resetting and showing home screen");
        state.currentRound = 1;
        state.breathCount = 0;
        state.isBreathing = false;
        setProgress(0);
        showScreen('home');
    }

    // Функции для управления кнопкой Breathe in
    function showBreatheInButton() {
        if (elements.breatheInButton) {
            elements.breatheInButton.classList.add('active');
        }
    }

    function hideBreatheInButton() {
        if (elements.breatheInButton) {
            elements.breatheInButton.classList.remove('active');
        }
    }

    // Breathing Exercise Functions
    async function startExercise() {
        console.log("Starting exercise");
        showScreen('exercise');
        await startRound();
    }

    function getCurrentHoldTime() {
        return Math.round(state.initialHoldTime * Math.pow(1.5, state.currentRound - 1));
    }

    async function countdown(seconds) {
        if (!elements.phase || !elements.round || !elements.counter) {
            console.error("Countdown elements not found!");
            return;
        }
        elements.phase.textContent = 'Get Ready';
        elements.round.textContent = `Round ${state.currentRound} of ${state.rounds}`;
        elements.counter.textContent = seconds;
        restartAnimation(elements.phase);
        restartAnimation(elements.round);
        restartAnimation(elements.counter);
        console.log("Starting countdown for", seconds, "seconds");
        await Promise.all([
            animateProgress(seconds * 1000, false, false), // Убываем (как при выдохе)
            updateCounterDuringHold(seconds)
        ]);
        setProgress(0);
        console.log("Countdown finished");
    }

    async function animateProgress(duration, isIncreasing = true, pauseAtEnds = true) {
        console.log("Starting animateProgress for", duration, "ms");
        return new Promise(resolve => {
            state.shouldStopAnimation = false; // Сбрасываем флаг перед началом анимации
            const startTime = performance.now();
            const endTime = startTime + duration;

            function animate(currentTime) {
                if (state.shouldStopAnimation) {
                    console.log("Animation stopped");
                    resolve();
                    return;
                }

                const elapsed = currentTime - startTime;
                const progressFraction = Math.min(elapsed / duration, 1);
                const progress = isIncreasing
                    ? progressFraction * 100
                    : (1 - progressFraction) * 100;

                setProgress(progress);

                if (progressFraction < 1) {
                    requestAnimationFrame(animate);
                } else {
                    if (pauseAtEnds) {
                        setTimeout(resolve, 500); // Пауза 0.5 секунды
                    } else {
                        resolve();
                    }
                }
            }

            requestAnimationFrame(animate);
        });
    }

    async function updateCounterDuringHold(duration) {
        if (!elements.counter) {
            console.error("Counter element not found!");
            return;
        }
        console.log("Starting updateCounterDuringHold for", duration, "seconds");
        for (let i = duration; i > 0; i--) {
            if (!state.isHolding && duration !== 5) { // Прерываем, если задержка прервана (кроме Get Ready)
                console.log("Counter interrupted due to hold break");
                break;
            }
            elements.counter.textContent = i;
            restartAnimation(elements.counter);
            await sleep(1000);
        }
        console.log("updateCounterDuringHold finished");
    }

    async function startRound() {
        console.log("Starting round", state.currentRound);
        await countdown(5);
        
        state.breathCount = 0;
        console.log("Starting breathing phase");
        
        // 30 breaths
        for (let i = 0; i < 30; i++) {
            state.breathCount++;
            
            // Inhale
            if (elements.phase && elements.counter) {
                elements.phase.textContent = 'Inhale';
                elements.counter.textContent = state.breathCount;
                restartAnimation(elements.phase);
                restartAnimation(elements.counter);
            }
            if (i === 29) {
                await animateProgress(3000, true, true); // Глубокий вдох
            } else {
                await animateProgress(1500, true, true); // Обычный вдох
            }
            
            // Exhale
            if (elements.phase) {
                elements.phase.textContent = 'Exhale';
                restartAnimation(elements.phase);
            }
            if (i === 29) {
                await animateProgress(3000, false, true); // Глубокий выдох
            } else {
                await animateProgress(1500, false, true); // Обычный выдох
            }
        }

        // First retention (основная задержка дыхания)
        const holdTime = getCurrentHoldTime();
        if (elements.phase && elements.counter) {
            elements.phase.textContent = 'Hold';
            elements.counter.textContent = holdTime;
            restartAnimation(elements.phase);
            restartAnimation(elements.counter);
        }

        state.isHolding = true; // Устанавливаем флаг задержки дыхания
        const showButtonDelay = 10 * 1000; // 10 секунд
        const hideButtonDelay = (holdTime - 5) * 1000; // За 5 секунд до конца

        // Планируем появление и исчезновение кнопки
        setTimeout(() => {
            if (state.isHolding) {
                showBreatheInButton();
                console.log("Breathe in button shown");
            }
        }, showButtonDelay);

        setTimeout(() => {
            if (state.isHolding) {
                hideBreatheInButton();
                console.log("Breathe in button hidden");
            }
        }, hideButtonDelay);

        // Запускаем анимацию и отсчет параллельно
        console.log("Starting first retention for", holdTime, "seconds");
        await Promise.all([
            animateProgress(holdTime * 1000, true, false),
            updateCounterDuringHold(holdTime)
        ]);

        // Если задержка не была прервана, скрываем кнопку
        if (state.isHolding) {
            hideBreatheInButton();
        }

        // Сбрасываем флаг
        state.isHolding = false;
        state.shouldStopAnimation = false;

        // Recovery breath
        if (elements.phase) {
            elements.phase.textContent = 'Deep Inhale';
            restartAnimation(elements.phase);
        }
        await animateProgress(3000, true, true);

        // Second retention (задержка на 15 секунд)
        if (elements.phase && elements.counter) {
            elements.phase.textContent = 'Hold';
            elements.counter.textContent = 15;
            restartAnimation(elements.phase);
            restartAnimation(elements.counter);
        }
        await Promise.all([
            animateProgress(15 * 1000, true, false),
            updateCounterDuringHold(15)
        ]);

        // Final exhale
        if (elements.phase) {
            elements.phase.textContent = 'Deep Exhale';
            restartAnimation(elements.phase);
        }
        await animateProgress(3000, false, true);

        // Check if more rounds
        if (state.currentRound < state.rounds) {
            state.currentRound++;
            await sleep(2000);
            await startRound();
        } else {
            showScreen('completion');
        }
    }

    // Utility Functions
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    console.log("App initialization completed");
});
