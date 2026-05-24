(() => {
  const messagesEl = UI.qs("#messages");
  const emptyState = UI.qs("#empty-state");
  const composer = UI.qs("#composer");
  const input = UI.qs("#prompt-input");
  const sendButton = UI.qs(".send-button");
  const chatSurface = UI.qs(".chat-surface");

  const state = {
    messages: [],
    isResponding: false,
    lastUserPrompt: ""
  };

  const responseLibrary = [
    {
      test: /protein|meal|dinner|breakfast/i,
      text: `Here is a high-protein option that stays practical:

**Greek bowl**
- 180g grilled chicken or tofu
- 150g Greek yogurt dressing
- cucumber, tomato, greens, lemon
- optional rice if you need more carbs

Estimated macros: **520 kcal**, **58g protein**, **42g carbs**, **14g fat**.

Tip: keep the sauce yogurt-based and add herbs for flavor without pushing calories too high.`
    },
    {
      test: /calorie|calories|analyze|macro/i,
      text: `A useful calorie review usually checks three things:

1. **Target alignment**: are you within 5-10% of your daily target?
2. **Protein floor**: aim for a consistent protein baseline before optimizing carbs or fats.
3. **Meal timing**: if you overeat at night, move more protein and fiber earlier.

Example tracking rule:
\`\`\`text
calories = target +/- 150
protein = bodyweight_kg * 1.6 to 2.2
fiber = 25g+ daily
\`\`\``
    },
    {
      test: /diet|plan|cut|fat loss|gain/i,
      text: `A clean 7-day plan should repeat core meals instead of inventing something new every day.

**Plan structure**
- Breakfast: protein + fiber
- Lunch: lean protein + slow carbs
- Dinner: protein + vegetables + flexible fats
- Snack: high-protein fallback

I would start with a small deficit, keep protein stable, and rotate 2-3 meals you actually enjoy.`
    },
    {
      test: /recipe|ideas|healthy/i,
      text: `Healthy breakfast ideas that are easy to repeat:

- **Oats + whey + berries** for a balanced macro profile
- **Eggs + toast + fruit** for satiety
- **Greek yogurt bowl** with nuts and banana
- **Paneer/tofu scramble** with vegetables

The best breakfast is the one that makes lunch easier, not the one that looks perfect on paper.`
    }
  ];

  function setEmptyState() {
    emptyState.hidden = state.messages.length > 0;
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      chatSurface.scrollTop = chatSurface.scrollHeight;
    });
  }

  function resizeInput() {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 190)}px`;
  }

  function markdownToHtml(markdown) {
    const escaped = UI.escapeHtml(markdown);
    const fenced = escaped.replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code.trim()}</code></pre>`);
    const inlineCode = fenced.replace(/`([^`]+)`/g, "<code>$1</code>");
    const bold = inlineCode.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    const lines = bold.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);

    return lines.map((block) => {
      if (block.startsWith("<pre>")) return block;
      if (/^[-*] /m.test(block)) {
        const items = block
          .split("\n")
          .filter((line) => /^[-*] /.test(line))
          .map((line) => `<li>${line.replace(/^[-*] /, "")}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }
      if (/^\d+\. /m.test(block)) {
        const items = block
          .split("\n")
          .filter((line) => /^\d+\. /.test(line))
          .map((line) => `<li>${line.replace(/^\d+\. /, "")}</li>`)
          .join("");
        return `<ol>${items}</ol>`;
      }
      return `<p>${block.replace(/\n/g, "<br>")}</p>`;
    }).join("");
  }

  function createMessageElement(message) {
    const article = document.createElement("article");
    article.className = `message ${message.role}`;
    article.dataset.messageId = message.id;

    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.textContent = message.role === "user" ? "You" : "AI";

    const body = document.createElement("div");
    body.className = "message-body";

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    if (message.loading) {
      bubble.innerHTML = `<div class="typing-bubble" aria-label="AI is typing"><span></span><span></span><span></span></div>`;
    } else {
      const content = document.createElement("div");
      content.className = "markdown";
      content.innerHTML = markdownToHtml(message.content);
      bubble.appendChild(content);
    }

    const meta = document.createElement("div");
    meta.className = "message-meta";
    meta.innerHTML = `<span>${message.time}</span>`;

    if (message.role === "assistant" && !message.loading) {
      const actions = document.createElement("div");
      actions.className = "message-actions";
      actions.innerHTML = `
        <button type="button" data-copy="${message.id}">Copy</button>
        <button type="button" data-retry="${message.id}">Retry</button>
      `;
      meta.appendChild(actions);
    }

    body.append(bubble, meta);
    article.append(avatar, body);
    return article;
  }

  function renderMessages() {
    messagesEl.innerHTML = "";
    state.messages.forEach((message) => messagesEl.appendChild(createMessageElement(message)));
    setEmptyState();
    scrollToBottom();
  }

  function addMessage(role, content, options = {}) {
    const message = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      role,
      content,
      loading: Boolean(options.loading),
      time: UI.formatTime()
    };
    state.messages.push(message);
    renderMessages();
    return message;
  }

  function getMockResponse(prompt) {
    const match = responseLibrary.find((item) => item.test.test(prompt));
    if (match) return match.text;

    return `I can help shape that into a practical nutrition decision.

**Quick framework**
- Clarify the goal: fat loss, maintenance, performance, or muscle gain
- Identify the constraint: time, hunger, budget, cooking skill, or cravings
- Choose the smallest action that improves consistency

For your prompt: "${prompt}", I would start by estimating calories, protein, and the easiest meal swap.`;
  }

  async function simulateAssistantResponse(prompt) {
    state.isResponding = true;
    sendButton.disabled = true;
    const loadingMessage = addMessage("assistant", "", { loading: true });

    await new Promise((resolve) => setTimeout(resolve, 850));

    const index = state.messages.findIndex((message) => message.id === loadingMessage.id);
    if (index !== -1) {
      state.messages[index] = {
        ...loadingMessage,
        loading: false,
        content: getMockResponse(prompt),
        time: UI.formatTime()
      };
    }

    state.isResponding = false;
    sendButton.disabled = false;
    renderMessages();
  }

  function sendPrompt(prompt) {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || state.isResponding) return;

    state.lastUserPrompt = cleanPrompt;
    addMessage("user", cleanPrompt);
    input.value = "";
    resizeInput();
    simulateAssistantResponse(cleanPrompt);
  }

  composer.addEventListener("submit", (event) => {
    event.preventDefault();
    sendPrompt(input.value);
  });

  input.addEventListener("input", resizeInput);

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendPrompt(input.value);
    }
  });

  UI.qsa("[data-prompt]").forEach((button) => {
    button.addEventListener("click", () => {
      input.value = button.dataset.prompt;
      resizeInput();
      input.focus();
      sendPrompt(button.dataset.prompt);
    });
  });

  UI.qsa("[data-new-chat]").forEach((button) => {
    button.addEventListener("click", () => {
      state.messages = [];
      state.lastUserPrompt = "";
      state.isResponding = false;
      sendButton.disabled = false;
      input.value = "";
      resizeInput();
      renderMessages();
      input.focus();
    });
  });

  messagesEl.addEventListener("click", (event) => {
    const copyButton = event.target.closest("[data-copy]");
    const retryButton = event.target.closest("[data-retry]");

    if (copyButton) {
      const message = state.messages.find((item) => item.id === copyButton.dataset.copy);
      if (!message) return;
      UI.copyText(message.content).then(() => {
        copyButton.textContent = "Copied";
        setTimeout(() => { copyButton.textContent = "Copy"; }, 1200);
      });
    }

    if (retryButton && state.lastUserPrompt && !state.isResponding) {
      simulateAssistantResponse(state.lastUserPrompt);
    }
  });

  renderMessages();
  resizeInput();
})();
