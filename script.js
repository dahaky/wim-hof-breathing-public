// Константы
const SMALL_SIZE = 'min(50vw, 200px)';
const LARGE_SIZE = 'min(75vw, 300px)';
const PHASE_DURATION = 1; // 1 секунда на фазу (вдох или выдох)
const PREPARATION_DURATION = 7000; // 7 секунд подготовки
const AUDIO_START_DELAY = 2000; // Задержка перед анимацией

// Глобальные переменные
let initialBreathHoldTime, numberOfRounds;
let currentBreathHoldTime, currentCycle = 0, currentRound = 0;
let isPaused = false, timerInterval, phaseTimeout, remainingTime, currentPhase, nextCallback;
let soundEnabled = false;
let audioContext, startAudioBuffer, breathingAudioBuffer, delayAudioBuffer, exhalationAudioBuffer;
let currentSource = null;

// Элементы DOM
const container = document.getElementById('container');
const circle = document.getElementById('circle');
const instruction = document.getElementById('instruction');
const timerInsideCircle = document.getElementById('timerInsideCircle');
const progressBar = document.getElementById('progressBar');
const progressBarContainer = document.getElementById('progressBarContainer');
const rippleEffect = document.getElementById('rippleEffect');

// Инициализация аудио
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

// Управление интерфейсом
function showSoundModal() {
    document.getElementById('soundModal').style.display = 'flex';
}

function showSettings() {
    const settings = document.getElementById('settings');
    settings.style.height = '80vh';
    settings.addEventListener('touchstart', handleTouchStart);
    settings.addEventListener('touchmove', handleTouchMove);
    settings.addEventListener('touchend', handleTouchEnd);
}

function closeSettings() {
    document.getElementById('settings').style.height = '0';
}

let touchStartY = 0;
function handleTouchStart(e) { touchStartY = e.touches[0].clientY; }
function handleTouchMove(e) { e.preventDefault(); }
function handleTouchEnd(e) {
    const touchEndY = e.changedTouches[0].clientY;
    if (touchEndY - touchStartY > 50) closeSettings();
}

// Анимация круга
function setCircle(size, isInhalation) {
    circle.style.width = size;
    circle.style.height = size;
    circle.classList.remove('inhalation', 'exhalation');
    circle.classList.add(isInhalation ? 'inhalation' : 'exhalation');
    circle.style.opacity = '1';
    circle.style.display = 'flex';
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
    progressBar.style.width = `${progress}%`;
}

function hideProgressbar() { progressBarContainer.style.display = 'none'; }

// Логика дыхания
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
    if (currentPhase === 'ВДОХ') {
        startPhase('ВДОХ', LARGE_SIZE, true, PHASE_DURATION, nextCallback);
    } else if (currentPhase === 'ВЫДОХ') {
        startPhase('ВЫДОХ', SMALL_SIZE, false, PHASE_DURATION, nextCallback);
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
    startPhase(isInhalation ? 'ВДОХ' : 'ВЫДОХ', isInhalation ? LARGE_SIZE : SMALL_SIZE, isInhalation, PHASE_DURATION, () => {
        updateProgressbar(index + 1);
        if (index < 59) {
            performCycle(index + 1, callback);
        } else {
            stopAudio();
            hideProgressbar();
            callback();
        }
    });
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

    container.classList.remove('initial-visible');
    container.classList.add('preparing');
    if (soundEnabled) playAudio(startAudioBuffer);
    setTimeout(() => {
        container.classList.remove('preparing');
        container.classList.add('breathing-visible');
        document.getElementById('breathingSection').style.display = 'flex';
        document.getElementById('pauseButton').style.display = 'inline';
        document.getElementById('resetButton').style.display = 'inline';
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
        document.getElementById('roundInfo').style.display = 'none';
        document.getElementById('completionMessage').style.display = 'flex';
        document.getElementById('breathingSection').style.display = 'none';
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
    container.classList.remove('breathing-visible', 'preparing');
    container.classList.add('initial-visible');
    document.getElementById('breathingSection').style.display = 'none';
    document.getElementById('completionMessage').style.display = 'none';
    document.getElementById('roundInfo').style.display = 'block';
    document.getElementById('pauseButton').style.display = 'none';
    document.getElementById('resetButton').style.display = 'none';
    currentCycle = 0;
    currentRound = 0;
    isPaused = false;
    document.getElementById('pauseButton').textContent = 'Пауза';
    hideProgressbar();
    circle.style.display = 'none';
}

// Инициализация
window.onload = async () => {
    await initAudio();
    ['initialBreathHoldTime', 'numberOfRounds'].forEach(id => {
        const slider = document.getElementById(id);
        const valueSpan = document.getElementById(id + 'Value');
        slider.addEventListener('input', () => valueSpan.textContent = slider.value);
    });
};
