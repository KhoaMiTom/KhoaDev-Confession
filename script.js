import badWords from './badwords.js';

const MAX_MESSAGE_LENGTH = 2000;
const MIN_MESSAGE_LENGTH = 10;
const MAX_REPEATED_CHARS = 10;
const form = document.getElementById('confessionForm');
const textarea = document.getElementById('confessionText');
const charCount = document.getElementById('charCount');
const submitBtn = document.getElementById('submitBtn');
const status = document.getElementById('status');
const nicknameInput = document.getElementById('senderName');
const TYPING_TIMEOUT = 800;
let typingTimer;

function updateCharCount() {
    const count = textarea.value.length;
    charCount.textContent = `${count} / ${MAX_MESSAGE_LENGTH}`;
    const percentage = count / MAX_MESSAGE_LENGTH;
    
    if (percentage > 0.9) {
        charCount.style.color = '#e74c3c';
    } else if (percentage > 0.7) {
        charCount.style.color = '#f39c12';
    } else {
        charCount.style.color = '#888';
    }
}

function splitMessage(message) {
    const chunks = [];
    let currentChunk = '';

    message.split(' ').forEach((word) => {
        if ((currentChunk + ' ' + word).length <= MAX_MESSAGE_LENGTH) {
            currentChunk += (currentChunk ? ' ' : '') + word;
        } else {
            chunks.push(currentChunk);
            currentChunk = word;
        }
    });

    if (currentChunk) {
        chunks.push(currentChunk);
    }

    return chunks;
}

function containsBadWords(text) {
    const lowerText = text.toLowerCase();
    return badWords.some(word => lowerText.includes(word.toLowerCase()));
}

function hasRepeatedChars(text) {
    const repeatedCharsRegex = /(.)\1{9,}/;
    return repeatedCharsRegex.test(text);
}

function getRandomColor() {
    const colors = ['#FF5733', '#33FF57', '#3357FF', '#FF33F5', '#33FFF5', '#F5FF33'];
    return colors[Math.floor(Math.random() * colors.length)];
}

async function sendToDiscord(content, nickname) {
    const confessionId = Math.floor(Math.random() * 10000);
    const embed = {
        title: `Confession #${confessionId}`,
        description: content,
        color: parseInt(getRandomColor().replace('#', ''), 16),
        footer: {
            text: nickname ? `Sent by: ${nickname}` : 'Anonymous'
        },
        timestamp: new Date().toISOString()
    };

    const response = await fetch(CONFIG.WEBHOOK_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            embeds: [embed],
            content: '---'
        }),
    });

    if (!response.ok) {
        throw new Error(`Không thể gửi tin nhắn đến Discord: ${response.statusText}`);
    }
}

function highlightBadWords(element) {
    let text = element.value;
    let highlightedText = text;
    let hasError = false;
    let errorWords = [];
    
    badWords.forEach(word => {
        const regex = new RegExp(word, 'gi');
        if (regex.test(text)) {
            hasError = true;
            errorWords.push(word);
        }
    });

    const oldTooltip = element.parentElement.querySelector('.error-tooltip');
    if (oldTooltip) {
        oldTooltip.remove();
    }

    if (hasError) {
        element.classList.add('highlight-error');
        
        const tooltip = document.createElement('div');
        tooltip.className = 'error-tooltip';
        tooltip.textContent = `Từ không phù hợp: ${errorWords.join(', ')}`;
        tooltip.style.display = 'block';
        
        element.parentElement.appendChild(tooltip);
    } else {
        element.classList.remove('highlight-error');
    }

    return hasError;
}

textarea.addEventListener('input', () => {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
        updateCharCount();
        highlightBadWords(textarea);
    }, TYPING_TIMEOUT);
});

nicknameInput.addEventListener('input', () => {
    highlightBadWords(nicknameInput);
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const confessionText = textarea.value.trim();
    const nickname = nicknameInput.value.trim();

    if (nickname && containsBadWords(nickname)) {
        showStatus('Nickname chứa từ không phù hợp', 'error');
        return;
    }

    if (confessionText === '') {
        showStatus('Vui lòng nhập tâm sự của bạn.', 'error');
        return;
    }

    if (confessionText.length < MIN_MESSAGE_LENGTH) {
        showStatus('Tâm sự của bạn quá ngắn.', 'error');
        return;
    }

    if (confessionText.length > MAX_MESSAGE_LENGTH) {
        showStatus('Tâm sự của bạn quá dài. Vui lòng rút ngắn lại.', 'error');
        return;
    }

    if (containsBadWords(confessionText)) {
        showStatus('Tâm sự của bạn chứa từ ngữ không phù hợp. Vui lòng kiểm tra lại.', 'error');
        return;
    }

    if (hasRepeatedChars(confessionText)) {
        showStatus('Tâm sự của bạn chứa quá nhiều ký tự lặp lại. Vui lòng kiểm tra lại.', 'error');
        return;
    }

    submitBtn.disabled = true;
    const spinner = document.querySelector('.loading-spinner');
    spinner.style.display = 'block';
    showStatus('Đang gửi tâm sự...', 'pending');

    try {
        const messages = splitMessage(confessionText);
        
        for (const message of messages) {
            await sendToDiscord(message, nickname);
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        showStatus('✨ Tâm sự đã được gửi thành công!', 'success');
        
        textarea.style.opacity = '0';
        nicknameInput.style.opacity = '0';
        
        setTimeout(() => {
            textarea.value = '';
            nicknameInput.value = '';
            textarea.style.opacity = '1';
            nicknameInput.style.opacity = '1';
            updateCharCount();
        }, 300);

    } catch (error) {
        console.error('Lỗi:', error);
        showStatus('❌ Đã xảy ra lỗi. Vui lòng thử lại sau.', 'error');
    } finally {
        submitBtn.disabled = false;
        spinner.style.display = 'none';
    }
});

function showStatus(message, type) {
    status.textContent = message;
    status.className = `status show ${type}`;
    
    const colors = {
        error: '#e74c3c',
        success: '#2ecc71',
        pending: '#3498db',
        default: '#333'
    };
    
    status.style.color = colors[type] || colors.default;

    if (type === 'error') {
        status.classList.add('shake');
        setTimeout(() => status.classList.remove('shake'), 500);
    }

    setTimeout(() => {
        status.classList.remove('show');
    }, 3000);
}

updateCharCount();

document.querySelectorAll('.faq-question').forEach(question => {
    question.addEventListener('click', () => {
        const faqItem = question.parentElement;
        const isActive = faqItem.classList.contains('active');
        
        document.querySelectorAll('.faq-item').forEach(item => {
            item.classList.remove('active');
        });
        
        if (!isActive) {
            faqItem.classList.add('active');
        }
    });
});

const themeSwitch = document.querySelector('.theme-switch');
const icon = themeSwitch.querySelector('i');

const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
updateThemeIcon(savedTheme);

themeSwitch.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    icon.style.animation = 'none';
    icon.offsetHeight;
    icon.style.animation = 'rotate 0.5s ease-in-out';
    
    updateThemeIcon(newTheme);
});

function updateThemeIcon(theme) {
    icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
}

