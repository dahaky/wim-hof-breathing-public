// Mock Telegram WebApp for testing outside Telegram
const tg = window.Telegram?.WebApp || {
    expand: () => console.log("Mock Telegram WebApp expand called"),
    ready: () => console.log("Mock Telegram WebApp ready called")
};
tg.expand();

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM fully loaded, initializing app...");

    // App State
    let state = {
        rounds: 3,
        initialHoldTime: 30,
        currentRound: 1,
        breathCount: 0,
        isBreathing: false
    };

    // DOM Elements
    const screens = {
        home: document.getElementById('homeScreen'),
        exercise: document.getElementById('exerciseScreen'),
        completion: document.getElementById('completionScreen')
    };

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
        modalOverlay: document.querySelector('.modal-overlay')
    };

    // Calculate circle circumference
    const radius = elements.progressRing.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    elements.progressRing.style.strokeDasharray = `${circumference} ${circumference}`;
    elements.progressRing.style.strokeDashoffset = circumference;

    function setProgress(percent) {
        const offset = circumference - (percent / 100 * circumference);
        elements.progressRing.style.strokeDashoffset = offset;
    }

    // Event Listeners
    elements.startButton?.addEventListener('click', () => {
        console.log("Start button clicked");
        startExercise();
    });
    elements.settingsButton?.addEventListener('click', () => {
        console.log("Settings button clicked");
        showSettings();
    });
    elements.saveSettings?.addEventListener('click', () => {
        console.log("Save settings button clicked");
        saveSettings();
    });
    elements.restartButton?.addEventListener('click', () => {
        console.log("Restart button clicked");
        resetAndShowHome();
    });
    elements.modalOverlay?.addEventListener('click', () => {
        console.log("Modal overlay clicked");
        hideSettings();
    });

    // Обновление значений ползунков в реальном времени
    elements.roundsInput?.addEventListener('input', () => {
        elements.roundsValue.textContent = elements.roundsInput.value;
    });
    elements.holdTimeInput?.addEventListener('input', () => {
        elements.holdTimeValue.textContent = elements.holdTimeInput.value;
    });

    // Navigation Functions
    function showScreen(screenId) {
        Object valoriues(screens).forEach(screen => {
            if (screen) {
                screen.classList.remove('active');
            }
        });
        if (screens[screenId]) {
            screens[screenId].classList.add('active');
        }
    }

    function showSettings() {
        console.log("Showing settings modal");
        elements.roundsInput.value = state.rounds;
        elements.holdTimeInput.value = state.initialHoldTime;
        elements.roundsValue.textContent = state.rounds;
        elements.holdTimeValue.textContent = state.initialHoldTime;
        elements.settingsModal.classList.add('active');
        elements.modalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function hideSettings() {
        console.log("Hiding settings modal");
        elements.settingsModal.classList.remove('active');
        elements.modalOverlay.classList.remove('active');
        document.body.style.overflow = 'hidden';
    }

    function saveSettings() {
        console.log("Saving settings");
        state.rounds = parseInt(elements.roundsInput.value) || 3;
        state.initialHoldTime = parseInt(elements.holdTimeInput.value) || 90;
        hideSettings();
    }

    function resetAndShowHome() {
        console.log("Resetting and showing home screen");
        state.currentRound = 1;
        state.breathCount = 0;
        state.isBreathing = false;
        setProgress(0);
        showScreen('home');
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
        elements.phase.textContent = 'Get Ready';
        elements.round.textContent = `Round ${state.currentRound} of ${state.rounds}`;
        elements.counter.textContent = seconds;
        // Плавная анимация для Get Ready
        await Promise.all([
            animateProgress(seconds * 1000, true, false),
            updateCounterDuringHold(seconds)
        ]);
        setProgress(0);
    }

    async function animateProgress(duration, isIncreasing = true, pauseAtEnds = true) {
        return new Promise(resolve => {
            const startTime = performance.now();
            const endTime = startTime + duration;

            function animate(currentTime) {
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
        for (let i = duration; i > 0; i--) {
            elements.counter.textContent = i;
            await sleep(1000);
        }
    }

    async function startRound() {
        console.log("Starting round", state.currentRound);
        await countdown(5);
        
        state.breathCount = 0;
        
        // 30 breaths
        for (let i = 0; i < 30; i++) {
            state.breathCount++;
            
            // Inhale
            elements.phase.textContent = 'Inhale';
            elements.counter.textContent = state.breathCount;
            if (i === 29) {
                await animateProgress(3000, true, true); // Глубокий вдох
            } else {
                await animateProgress(1500, true, true); // Обычный вдох
            }
            
            // Exhale
            elements.phase.textContent = 'Exhale';
            if (i === 29) {
                await animateProgress(3000, false, true); // Глубокий выдох
            } else {
                await animateProgress(1500, false, true); // Обычный выдох
            }
        }

        // First retention (основная задержка дыхания)
        const holdTime = getCurrentHoldTime();
        elements.phase.textContent = 'Hold';
        elements.counter.textContent = holdTime;
        await Promise.all([
            animateProgress(holdTime * 1000, true, false),
            updateCounterDuringHold(holdTime)
        ]);

        // Recovery breath
        elements.phase.textContent = 'Deep Inhale';
        await animateProgress(3000, true, true);

        // Second retention (задержка на 15 секунд)
        elements.phase.textContent = 'Hold';
        elements.counter.textContent = 15;
        await Promise.all([
            animateProgress(15 * 1000, true, false),
            updateCounterDuringHold(15)
        ]);

        // Final exhale
        elements.phase.textContent = 'Deep Exhale';
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
});
