const SMALL_SIZE = 'min(50vw, 200px)';
const LARGE_SIZE = 'min(75vw, 300px)';
const PHASE_DURATION = 1.87;
const LAST_PHASE_DURATION = 3;
const ANIMATION_DURATION = 0.5;
const HOLD_DURATION = PHASE_DURATION - (ANIMATION_DURATION * 2);
const PREPARATION_DURATION = 17000;
const AUDIO_START_DELAY = 2000;

let initialBreathHoldTime, numberOfRounds;
let currentBreathHoldTime, currentCycle = 0, currentRound = 0;
let isPaused = false, timerInterval, phaseTimeout, remainingTime, currentPhase, nextCallback;
let soundEnabled = false;
let audioContext, startAudioBuffer, breathingAudioBuffer, delayAudioBuffer, exhalationAudioBuffer;
let currentSource = null;

const container = document.getElementById('container');
const circle = document.getElementById('circle');
const instruction = document.getElementById('instruction');
const timerInsideCircle = document.getElementById('timerInsideCircle');
const progressBar = document.getElementById('progressBar');
const progressBarContainer = document.getElementById('progressBarContainer');
const rippleEffect = document.getElementById('rippleEffect');
const screens = {
    initial: document.getElementById('initialScreen'),
    preparation: document.getElementById('preparationScreen'),
    breathing: document.getElementById('breathingScreen'),
    completion: document.getElementById('completionScreen')
};

async function initAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') await audioContext.resume();

    const loadAudio = async (url) => {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        return await audioContext.decodeAudioData(arrayBuffer);
    };

    startAudioBuffer = await loadAudio('start.MP3');
    breathingAudioBuffer = await loadAudio('breathing.MP3');
    delayAudioBuffer = await loadAudio('delay.MP3');
    exhalationAudioBuffer = await loadAudio('exhalation.MP3');
}

function playAudio(buffer, loop = false) {
    if (!soundEnabled || !buffer) return;
    if (currentSource) currentSource.stop();
    currentSource = audioContext.createBufferSource();
    currentSource.buffer = buffer;
    currentSource.loop = loop;
    currentSource.connect(audioContext.destination);
    currentSource.start();
}

function stopAudio() {
    if (currentSource) currentSource.stop();
    currentSource = null;
}

function switchScreen(screenId) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    screens[screenId].classList.add('active');
}

function showSettings() {
    document.getElementById('settings').style.height = '80vh';
}

function closeSettings() {
    document.getElementById('settings').style.height = '0';
}

function setCircle(size, isInhalation) {
    circle.style.width = size;
    circle.style.height = size;
    circle.classList.remove('inhalation', 'exhalation');
    circle.classList.add(isInhalation ? 'inhalation' : 'exhalation');
    circle.style.opacity = '1';
}

function setInstruction(text) {
    instruction.textContent = text;
    instruction.style.opacity = '1';
}

function hideInstruction() { instruction.style.opacity = '0'; }

function setRoundInfo(round, total) {
    document.getElementById('roundInfo').textContent = `Раунд ${round} из ${total}`;
}

function setTimer(time) {
    timerInsideCircle.textContent = time;
    timerInsideCircle.style.display = 'block';
}

function hideTimer() { timerInsideCircle.style.display = 'none'; }

function showProgressbar() {
    progressBarContainer.style.display = 'block';
    progressBar.style.width = '0%';
}

function updateProgressbar(cycleNumber) {
    const progress = (cycleNumber / 60) * 100;
    progressBar.style.transition = `width ${PHASE_DURATION}s linear`;
    progressBar.style.width = `${progress}%`;
}

function hideProgressbar() { progressBarContainer.style.display = 'none'; }

function startPhase(phaseName, size, isInhalation, duration, callback) {
    if (isPaused) return;
    setInstruction(phaseName);
    setCircle(size, isInhalation);
    currentPhase = phaseName;
    phaseTimeout = setTimeout(() => {
        if (!isPaused) callback();
    }, duration * 1000);
}

function startHoldPhase(phaseName, time, size, isInhalation, callback) {
    if (isPaused) return;
    setInstruction(phaseName);
    setCircle(size, isInhalation);
    rippleEffect.classList.add('active');
    let remaining = time;
    remainingTime = remaining;
    currentPhase = phaseName;
    nextCallback = () => {
        rippleEffect.classList.remove('active');
        callback();
    };
    setTimer(remaining);
    playAudio(delayAudioBuffer, true);
    timerInterval = setInterval(() => {
        if (!isPaused && remaining >= 0) {
            remaining--;
            setTimer(remaining);
            if (remaining === 7) {
                stopAudio();
                playAudio(exhalationAudioBuffer);
            }
        }
    }, 1000);
    phaseTimeout = setTimeout(() => {
        clearInterval(timerInterval);
        setTimer(0);
        rippleEffect.classList.remove('active');
        stopAudio();
        hideTimer();
        if (!isPaused) callback();
    }, time * 1000);
}

function resumePhase() {
    const isLastPhase = currentCycle === 58 || currentCycle === 59;
    if (currentPhase === 'ВДОХ') {
        const duration = isLastPhase ? 1 : ANIMATION_DURATION;
        startPhase('ВДОХ', LARGE_SIZE, true, duration, nextCallback);
    } else if (currentPhase === 'ВЫДОХ') {
        const duration = isLastPhase ? 1 : ANIMATION_DURATION;
        startPhase('ВЫДОХ', SMALL_SIZE, false, duration, nextCallback);
    } else if (currentPhase === 'Задержка дыхания после выдоха') {
        startHoldPhase('Задержка дыхания после выдоха', remainingTime, SMALL_SIZE, false, nextCallback);
    } else if (currentPhase === 'Глубокий вдох') {
        startPhase('Глубокий вдох', LARGE_SIZE, true, PHASE_DURATION, nextCallback);
    } else if (currentPhase === 'Частичный выдох') {
        startPhase('Частичный выдох', SMALL_SIZE, false, PHASE_DURATION, nextCallback);
    } else if (currentPhase === 'Задержка после глубокого вдоха') {
        startHoldPhase('Задержка после глубокого вдоха', remainingTime, LARGE_SIZE, true, nextCallback);
    } else if (currentPhase === 'Финальный выдох') {
        startPhase('Финальный выдох', SMALL_SIZE, false, PHASE_DURATION, nextCallback);
    }
}

function performCycle(index, callback) {
    if (index === 0) {
        playAudio(breathingAudioBuffer);
        showProgressbar();
    }
    const isInhalation = index % 2 === 0;
    const isLastPhase = index === 58 || index === 59;
    const duration = isLastPhase ? LAST_PHASE_DURATION : PHASE_DURATION;

    if (isLastPhase) {
        circle.style.transition = `width 1s ease-in-out, height 1s ease-in-out, border-color 1s ease-in-out, box-shadow 1s ease-in-out`;
        startPhase(isInhalation ? 'ВДОХ' : 'ВЫДОХ', isInhalation ? LARGE_SIZE : SMALL_SIZE, isInhalation, 1, () => {
            setTimeout(() => {
                circle.style.transition = `width 1s ease-in-out, height 1s ease-in-out, border-color 1s ease-in-out, box-shadow 1s ease-in-out`;
                setCircle(isInhalation ? SMALL_SIZE : LARGE_SIZE, !isInhalation);
                setTimeout(() => {
                    updateProgressbar(index + 1);
                    if (index < 59) {
                        performCycle(index + 1, callback);
                    } else {
                        stopAudio();
                        hideProgressbar();
                        callback();
                    }
                }, 1000);
            }, 1000);
        });
    } else {
        circle.style.transition = `width ${ANIMATION_DURATION}s ease-in-out, height ${ANIMATION_DURATION}s ease-in-out, border-color ${ANIMATION_DURATION}s ease-in-out, box-shadow ${ANIMATION_DURATION}s ease-in-out`;
        startPhase(isInhalation ? 'ВДОХ' : 'ВЫДОХ', isInhalation ? LARGE_SIZE : SMALL_SIZE, isInhalation, ANIMATION_DURATION, () => {
            setTimeout(() => {
                circle.style.transition = `width ${ANIMATION_DURATION}s ease-in-out, height ${ANIMATION_DURATION}s ease-in-out, border-color ${ANIMATION_DURATION}s ease-in-out, box-shadow ${ANIMATION_DURATION}s ease-in-out`;
                setCircle(isInhalation ? SMALL_SIZE : LARGE_SIZE, !isInhalation);
                setTimeout(() => {
                    updateProgressbar(index + 1);
                    if (index < 59) {
                        performCycle(index + 1, callback);
                    } else {
                        stopAudio();
                        hideProgressbar();
                        callback();
                    }
                }, ANIMATION_DURATION * 1000);
            }, HOLD_DURATION * 1000);
        });
    }
}

function performBreathHold() {
    startPhase('Глубокий вдох', LARGE_SIZE, true, PHASE_DURATION, () => {
        startPhase('Частичный выдох', SMALL_SIZE, false, PHASE_DURATION, () => {
            startHoldPhase('Задержка дыхания после выдоха', currentBreathHoldTime, SMALL_SIZE, false, () => {
                startPhase('Глубокий вдох', LARGE_SIZE, true, PHASE_DURATION, () => {
                    startHoldPhase('Задержка после глубокого вдоха', 15, LARGE_SIZE, true, () => {
                        startPhase('Финальный выдох', SMALL_SIZE, false, PHASE_DURATION, endRound);
                    });
                });
            });
        });
    });
}

function startRound() {
    currentCycle = 0;
    setRoundInfo(currentRound + 1, numberOfRounds);
    setTimeout(() => performCycle(0, performBreathHold), AUDIO_START_DELAY);
}

async function startSession(useSound) {
    soundEnabled = useSound;
    document.getElementById('soundModal').style.display = 'none';
    if (soundEnabled && audioContext.state === 'suspended') await audioContext.resume();

    initialBreathHoldTime = parseInt(document.getElementById('initialBreathHoldTime').value) || 60;
    numberOfRounds = parseInt(document.getElementById('numberOfRounds').value) || 3;
    currentBreathHoldTime = initialBreathHoldTime;
    currentRound = 0;

    switchScreen('preparation');
    if (soundEnabled) playAudio(startAudioBuffer);

    const preparationTimer = document.getElementById('preparationTimer');
    let remainingTime = 17;
    preparationTimer.textContent = remainingTime;
    const timerInterval = setInterval(() => {
        remainingTime--;
        preparationTimer.textContent = remainingTime;
        if (remainingTime <= 0) clearInterval(timerInterval);
    }, 1000);

    setTimeout(() => {
        switchScreen('breathing');
        setCircle(SMALL_SIZE, false);
        startRound();
    }, PREPARATION_DURATION);
}

function endRound() {
    currentRound++;
    if (currentRound < numberOfRounds) {
        currentBreathHoldTime = Math.round(currentBreathHoldTime * 1.68);
        setCircle(SMALL_SIZE, false);
        startRound();
    } else {
        switchScreen('completion');
    }
}

function pauseSession() {
    if (!isPaused) {
        clearInterval(timerInterval);
        clearTimeout(phaseTimeout);
        stopAudio();
        isPaused = true;
        document.getElementById('pauseButton').textContent = 'Продолжить';
    } else {
        isPaused = false;
        document.getElementById('pauseButton').textContent = 'Пауза';
        resumePhase();
    }
}

function resetSession() {
    clearInterval(timerInterval);
    clearTimeout(phaseTimeout);
    stopAudio();
    switchScreen('initial');
    currentCycle = 0;
    currentRound = 0;
    isPaused = false;
    document.getElementById('pauseButton').textContent = 'Пауза';
    hideProgressbar();
    circle.style.opacity = '0';
}

window.onload = async () => {
    await initAudio();
    ['initialBreathHoldTime', 'numberOfRounds'].forEach(id => {
        const slider = document.getElementById(id);
        const valueSpan = document.getElementById(id + 'Value');
        slider.addEventListener('input', () => valueSpan.textContent = slider.value);
    });
    switchScreen('initial');
};
