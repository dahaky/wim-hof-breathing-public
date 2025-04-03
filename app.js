// app.js
const tg = window.Telegram?.WebApp || {
    expand: () => console.log("Mock Telegram WebApp expand called"),
    ready: () => console.log("Mock Telegram WebApp ready called")
};

tg.expand();

document.addEventListener('DOMContentLoaded', function() {
    let state = {
        rounds: 3,
        initialHoldTime: 30,
        currentRound: 1,
        breathCount: 0,
        isBreathing: false,
        isHolding: false,
        shouldStopAnimation: false,
        soundEnabled: false
    };

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
        modalOverlay: document.querySelector('.modal-overlay'),
        breatheInButton: document.getElementById('breatheInButton'),
        soundToggle: document.getElementById('soundToggle')
    };

    const sounds = {
        countdown: document.getElementById('countdownSound'),
        backgroundBreathing: document.getElementById('backgroundBreathing'),
        backgroundHold: document.getElementById('backgroundHold'),
        inhale: document.getElementById('inhaleSound'),
        exhale: document.getElementById('exhaleSound')
    };

    // Добавляем обработку ошибок и логирование для аудио
    Object.values(sounds).forEach(sound => {
        if (sound) {
            sound.addEventListener('error', (e) => {
                console.error(`Error loading audio ${sound.id}:`, e);
            });
            sound.addEventListener('canplaythrough', () => {
                console.log(`Audio ${sound.id} is ready to play`);
            });
            sound.addEventListener('play', () => {
                console.log(`Audio ${sound.id} started playing`);
            });
        }
    });

    let circumference = 0;
    if (elements.progressRing) {
        const radius = elements.progressRing.r.baseVal.value;
        circumference = radius * 2 * Math.PI;
        elements.progressRing.style.strokeDasharray = `${circumference} ${circumference}`;
        elements.progressRing.style.strokeDashoffset = circumference;
    }

    function setProgress(percent) {
        if (!elements.progressRing) return;
        const offset = circumference - (percent / 100 * circumference);
        elements.progressRing.style.strokeDashoffset = offset;
    }

    function toggleSound() {
        state.soundEnabled = !state.soundEnabled;
        console.log(`Sound toggled: ${state.soundEnabled ? 'ON' : 'OFF'}`);
        
        if (!state.soundEnabled) {
            stopAllSounds();
        }
    }

    function playSound(sound) {
        if (state.soundEnabled && sound) {
            sound.currentTime = 0;
            sound.play().catch(e => console.log('Sound play error:', e));
        }
    }

    function stopAllSounds() {
        Object.values(sounds).forEach(sound => {
            if (sound) {
                sound.pause();
                sound.currentTime = 0;
            }
        });
    }

    elements.startButton?.addEventListener('click', startExercise);
    elements.settingsButton?.addEventListener('click', showSettings);
    elements.saveSettings?.addEventListener('click', saveSettings);
    elements.restartButton?.addEventListener('click', resetAndShowHome);
    elements.modalOverlay?.addEventListener('click', hideSettings);
    elements.soundToggle?.addEventListener('change', toggleSound);
    elements.breatheInButton?.addEventListener('click', () => {
        state.isHolding = false;
        state.shouldStopAnimation = true;
        hideBreatheInButton();
        if (state.soundEnabled) {
            sounds.backgroundHold.pause();
            playSound(sounds.backgroundBreathing);
        }
    });

    elements.roundsInput?.addEventListener('input', () => {
        if (elements.roundsValue) elements.roundsValue.textContent = elements.roundsInput.value;
    });

    elements.holdTimeInput?.addEventListener('input', () => {
        if (elements.holdTimeValue) elements.holdTimeValue.textContent = elements.holdTimeInput.value;
    });

    function restartAnimation(element) {
        if (!element || element.id === 'counter') return;
        element.style.animation = 'none';
        element.offsetHeight;
        element.style.animation = null;
    }

    function showScreen(screenId) {
        Object.values(screens).forEach(screen => {
            if (screen) screen.classList.remove('active');
        });
        if (screens[screenId]) screens[screenId].classList.add('active');
    }

    function showSettings() {
        if (elements.roundsInput && elements.holdTimeInput) {
            elements.roundsInput.value = state.rounds;
            elements.holdTimeInput.value = state.initialHoldTime;
            if (elements.roundsValue) elements.roundsValue.textContent = state.rounds;
            if (elements.holdTimeValue) elements.holdTimeValue.textContent = state.initialHoldTime;
        }
        elements.settingsModal?.classList.add('active');
        elements.modalOverlay?.classList.add('active');
    }

    function hideSettings() {
        elements.settingsModal?.classList.remove('active');
        elements.modalOverlay?.classList.remove('active');
    }

    function saveSettings() {
        if (elements.roundsInput && elements.holdTimeInput) {
            state.rounds = parseInt(elements.roundsInput.value) || 3;
            state.initialHoldTime = parseInt(elements.holdTimeInput.value) || 90;
            hideSettings();
        }
    }

    function resetAndShowHome() {
        state.currentRound = 1;
        state.breathCount = 0;
        state.isBreathing = false;
        setProgress(0);
        stopAllSounds();
        showScreen('home');
    }

    function showBreatheInButton() {
        elements.breatheInButton?.classList.add('active');
    }

    function hideBreatheInButton() {
        elements.breatheInButton?.classList.remove('active');
    }

    async function startExercise() {
        stopAllSounds();
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
        restartAnimation(elements.phase);
        restartAnimation(elements.round);
        
        if (state.soundEnabled) {
            playSound(sounds.countdown);
        }
        
        await Promise.all([
            animateProgress(seconds * 1000, false, false),
            updateCounterDuringHold(seconds)
        ]);
        
        setProgress(0);
        if (state.soundEnabled) {
            sounds.countdown.pause();
        }
    }

    async function animateProgress(duration, isIncreasing = true, pauseAtEnds = true) {
        return new Promise(resolve => {
            state.shouldStopAnimation = false;
            const startTime = performance.now();

            function animate(currentTime) {
                if (state.shouldStopAnimation) {
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
                        setTimeout(resolve, 800);
                    } else {
                        resolve();
                    }
                }
            }

            requestAnimationFrame(animate);
        });
    }

    async function updateCounterDuringHold(duration) {
        if (!elements.counter) return;
        
        for (let i = duration; i > 0; i--) {
            if (!state.isHolding && duration !== 5) break;
            if (i === 1) continue;
            elements.counter.textContent = i;
            await sleep(1000);
        }
    }

    async function startRound() {
        await countdown(5);
        
        state.breathCount = 0;
        if (state.soundEnabled) {
            playSound(sounds.backgroundBreathing);
        }
        
        for (let i = 0; i < 30; i++) {
            state.breathCount++;
            
            elements.phase.textContent = 'Inhale';
            elements.counter.textContent = state.breathCount;
            restartAnimation(elements.phase);
            
            if (state.soundEnabled) {
                playSound(sounds.inhale);
            }
            await animateProgress(i === 29 ? 3000 : 1500, true, true);
            
            elements.phase.textContent = 'Exhale';
            restartAnimation(elements.phase);
            if (state.soundEnabled) {
                playSound(sounds.exhale);
            }
            await animateProgress(i === 29 ? 3000 : 1500, false, true);
        }

        const holdTime = getCurrentHoldTime();
        elements.phase.textContent = 'Hold';
        elements.counter.textContent = holdTime;
        restartAnimation(elements.phase);
        
        if (state.soundEnabled) {
            sounds.backgroundBreathing.pause();
            playSound(sounds.backgroundHold);
        }

        state.isHolding = true;
        
        setTimeout(() => {
            if (state.isHolding) showBreatheInButton();
        }, 10000);

        setTimeout(() => {
            if (state.isHolding) hideBreatheInButton();
        }, (holdTime - 5) * 1000);

        await Promise.all([
            animateProgress(holdTime * 1000, true, false),
            updateCounterDuringHold(holdTime)
        ]);

        if (state.isHolding) hideBreatheInButton();

        state.isHolding = false;
        state.shouldStopAnimation = false;

        elements.phase.textContent = 'Deep Inhale';
        elements.counter.textContent = '';
        restartAnimation(elements.phase);
        if (state.soundEnabled) {
            playSound(sounds.inhale);
            sounds.backgroundHold.pause();
            playSound(sounds.backgroundBreathing);
        }
        await animateProgress(3000, true, true);

        elements.phase.textContent = 'Hold';
        elements.counter.textContent = '15';
        restartAnimation(elements.phase);
        if (state.soundEnabled) {
            sounds.backgroundBreathing.pause();
            playSound(sounds.backgroundHold);
        }
        
        await Promise.all([
            animateProgress(15000, true, false),
            updateCounterDuringHold(15)
        ]);

        elements.phase.textContent = 'Deep Exhale';
        elements.counter.textContent = '';
        restartAnimation(elements.phase);
        if (state.soundEnabled) {
            playSound(sounds.exhale);
            sounds.backgroundHold.pause();
            playSound(sounds.backgroundBreathing);
        }
        await animateProgress(3000, false, true);

        if (state.currentRound < state.rounds) {
            state.currentRound++;
            await sleep(2000);
            await startRound();
        } else {
            stopAllSounds();
            showScreen('completion');
        }
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
});
