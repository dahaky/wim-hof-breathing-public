// Константы остаются без изменений
const SMALL_SIZE = 'min(50vw, 200px)';
const LARGE_SIZE = 'min(75vw, 300px)';
const PHASE_DURATION = 1.87;
const LAST_PHASE_DURATION = 3;
const ANIMATION_DURATION = 0.5;
const HOLD_DURATION = PHASE_DURATION - (ANIMATION_DURATION * 2);
const PREPARATION_DURATION = 17000;
const AUDIO_START_DELAY = 2000;

// Глобальные переменные остаются без изменений
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
const screens = {
    initial: document.getElementById('initialScreen'),
    preparation: document.getElementById('preparationScreen'),
    breathing: document.getElementById('breathingScreen'),
    completion: document.getElementById('completionScreen')
};

// Функции аудио остаются без изменений
async function initAudio() { /* ... */ }
function playAudio(buffer, loop = false) { /* ... */ }
function stopAudio() { /* ... */ }

// Управление экранами
function switchScreen(screenId) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    screens[screenId].classList.add('active');
}

// Настройки
function showSettings() {
    document.getElementById('settings').style.height = '80vh';
}

function closeSettings() {
    document.getElementById('settings').style.height = '0';
}

// Анимация круга и остальные функции остаются без изменений
function setCircle(size, isInhalation) { /* ... */ }
function setInstruction(text) { /* ... */ }
function hideInstruction() { /* ... */ }
function setRoundInfo(round, total) { /* ... */ }
function setTimer(time) { /* ... */ }
function hideTimer() { /* ... */ }
function showProgressbar() { /* ... */ }
function updateProgressbar(cycleNumber) { /* ... */ }
function hideProgressbar() { /* ... */ }
function startPhase(phaseName, size, isInhalation, duration, callback) { /* ... */ }
function startHoldPhase(phaseName, time, size, isInhalation, callback) { /* ... */ }
function resumePhase() { /* ... */ }
function performCycle(index, callback) { /* ... */ }
function performBreathHold() { /* ... */ }
function startRound() { /* ... */ }

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

function pauseSession() { /* ... */ }
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
