const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const personaSelect = document.getElementById('personaSelect');
const statusBadge = document.getElementById('statusBadge');
const generatedImage = document.getElementById('generatedImage');
const imageForm = document.getElementById('imageForm');
const imagePrompt = document.getElementById('imagePrompt');
const imageStyle = document.getElementById('imageStyle');

const chatHistory = [
  {
    role: 'assistant',
    content: 'Welcome to the story. I am ready to roleplay with you. What is your first move?'
  }
];

function renderMessages() {
  chatMessages.innerHTML = '';

  chatHistory.forEach((message) => {
    const bubble = document.createElement('div');
    bubble.className = `message ${message.role}`;
    bubble.textContent = message.content;
    chatMessages.appendChild(bubble);
  });

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function fetchConfig() {
  const response = await fetch('/api/config');
  const config = await response.json();

  if (config.hasOpenRouterKey || config.hasHuggingFaceKey) {
    statusBadge.textContent = 'AI connected';
    statusBadge.style.background = 'rgba(34, 197, 94, 0.12)';
    statusBadge.style.borderColor = 'rgba(34, 197, 94, 0.4)';
    statusBadge.style.color = '#bbf7d0';
  } else {
    statusBadge.textContent = 'Demo mode';
  }
}

async function sendRoleplayMessage() {
  const value = chatInput.value.trim();
  if (!value) return;

  const userMessage = { role: 'user', content: value };
  chatHistory.push(userMessage);
  chatInput.value = '';
  renderMessages();

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messages: chatHistory,
      persona: personaSelect.value
    })
  });

  const data = await response.json();
  chatHistory.push({ role: 'assistant', content: data.reply || 'I am still here, ready to continue.' });
  renderMessages();
}

chatForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await sendRoleplayMessage();
});

imageForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const prompt = imagePrompt.value.trim() || 'A magical forest at twilight';
  const style = imageStyle.value;

  const response = await fetch('/api/image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ prompt, style })
  });

  const data = await response.json();
  generatedImage.src = data.imageData;
  generatedImage.classList.add('visible');
});

imagePrompt.value = 'A floating city over the clouds, glowing lanterns, cinematic lighting';
renderMessages();
fetchConfig();
