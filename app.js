// Initialize Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
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
    elements.startButton?.addEventListener('click', startExercise);
    elements.settingsButton?.addEventListener('click', showSettings);
    elements.saveSettings?.addEventListener('click', saveSettings);
    elements.restartButton?.addEventListener('click', resetAndShowHome);
    elements.modalOverlay?.addEventListener('click', hideSettings);

    // Navigation Functions
    function showScreen(screenId) {
        Object.values(screens).forEach(screen => {
            if (screen) {
                screen.classList.remove('active');
            }
        });
        if (screens[screenId]) {
            screens[screenId].classList.add('active');
        }
    }

    function showSettings() {
        elements.roundsInput.value = state.rounds;
        elements.holdTimeInput.value = state.initialHoldTime;
        elements.settingsModal.classList.add('active');
        elements.modalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function hideSettings() {
        elements.settingsModal.classList.remove('active');
        elements.modalOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    function saveSettings() {
        state.rounds = parseInt(elements.roundsInput.value) || 3;
        state.initialHoldTime = parseInt(elements.holdTimeInput.value) || 90;
        hideSettings();
    }

    function resetAndShowHome() {
        state.currentRound = 1;
        state.breathCount = 0;
        state.isBreathing = false;
        setProgress(0);
        showScreen('home');
    }

    // Breathing Exercise Functions
    async function startExercise() {
        showScreen('exercise');
        await startRound();
    }

    function getCurrentHoldTime() {
        return Math.round(state.initialHoldTime * Math.pow(1.5, state.currentRound - 1));
    }

    async function countdown(seconds) {
        elements.phase.textContent = 'Get Ready';
        elements.round.textContent = `Round ${state.currentRound} of ${state.rounds}`;
        for (let i = seconds; i > 0; i--) {
            elements.counter.textContent = i;
            setProgress((seconds - i) / seconds * 100);
            await sleep(1000);
        }
        setProgress(0);
    }

    async function animateProgress(duration, isIncreasing = true) {
        const fps = 60;
        const frames = duration * fps / 1000;
        const increment = 100 / frames;
        
        for (let i = 0; i < frames; i++) {
            const progress = isIncreasing ? i * increment : 100 - (i * increment);
            setProgress(progress);
            await sleep(1000 / fps);
        }
    }

    async function startRound() {
        // Preparation countdown
        await countdown(5);
        
        state.breathCount = 0;
        
        // 30 breaths
        for (let i = 0; i < 30; i++) {
            state.breathCount++;
            
            // Inhale
            elements.phase.textContent = 'Inhale';
            elements.counter.textContent = state.breathCount;
            setProgress((state.breathCount / 30) * 100);
            
            // Last breath is deeper
            if (i === 29) {
                await sleep(3000);
            } else {
                await sleep(1500);
            }
            
            // Exhale
            elements.phase.textContent = 'Exhale';
            if (i === 29) {
                await sleep(3000);
            } else {
                await sleep(1500);
            }
        }

        // First retention
        const holdTime = getCurrentHoldTime();
        elements.phase.textContent = 'Hold';
        for (let i = holdTime; i > 0; i--) {
            elements.counter.textContent = i;
            setProgress((holdTime - i) / holdTime * 100);
            await sleep(1000);
        }

        // Recovery breath
        elements.phase.textContent = 'Deep Inhale';
        await animateProgress(3000);

        // Second retention
        elements.phase.textContent = 'Hold';
        for (let i = 15; i > 0; i--) {
            elements.counter.textContent = i;
            setProgress((15 - i) / 15 * 100);
            await sleep(1000);
        }

        // Final exhale
        elements.phase.textContent = 'Deep Exhale';
        await animateProgress(3000, false);

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
