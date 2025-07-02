document.addEventListener("DOMContentLoaded", () => {
  const socket = io();
  const DOM = {
    chatContainer: document.getElementById("chatContainer"),
    promptInput: document.getElementById("promptInput"),
    chatForm: document.getElementById("chatForm"),
    sendButton: document.querySelector('#chatForm button[type="submit"]'),
    imageInput: document.getElementById("imageInput"),
    imagePreviewContainer: document.getElementById("imagePreviewContainer"),
    imagePreview: document.getElementById("imagePreview"),
    removeImageBtn: document.getElementById("removeImageBtn"),
    toast: document.getElementById("toast"),
  };
  let attachedFile = null;
  let typingIndicatorElement = null;

  const renderer = new marked.Renderer();
  renderer.code = function (code, lang) {
    const randomId = `code-${Math.random().toString(36).substring(2, 9)}`;
    const highlightedCode = hljs.getLanguage(lang)
      ? hljs.highlight(code, { language: lang, ignoreIllegals: true }).value
      : hljs.highlightAuto(code).value;

    return `
            <div class="code-block relative bg-[#0d1117] rounded-lg my-4">
              <div class="flex justify-between items-center bg-gray-900 px-4 py-1.5 rounded-t-md border-b border-gray-700">
                <span class="text-gray-400 text-xs font-semibold select-none">${
                  lang || "código"
                }</span>
                <button data-clipboard-target="#${randomId}" class="copy-code-btn flex items-center gap-2 text-xs text-gray-300 hover:text-white transition">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M7 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H7zM6 4a1 1 0 011-1h8a1 1 0 011 1v12a1 1 0 01-1 1H7a1 1 0 01-1-1V4z"></path></svg>
                  <span>Copiar</span>
                </button>
              </div>
              <pre class="p-4 overflow-x-auto"><code id="${randomId}" class="language-${lang}">${highlightedCode}</code></pre>
            </div>`;
  };
  marked.setOptions({ renderer: renderer, gfm: true, breaks: true });

  const showToast = (message, duration = 4000) => {
    DOM.toast.textContent = message;
    DOM.toast.classList.replace("opacity-0", "opacity-100");
    setTimeout(
      () => DOM.toast.classList.replace("opacity-100", "opacity-0"),
      duration
    );
  };

  const scrollToBottom = () => {
    DOM.chatContainer.scrollTop = DOM.chatContainer.scrollHeight;
  };

  const adjustTextareaHeight = () => {
    DOM.promptInput.style.height = "auto";
    DOM.promptInput.style.height = `${DOM.promptInput.scrollHeight}px`;
  };

  const checkSendButtonStatus = () => {
    DOM.sendButton.disabled =
      DOM.promptInput.value.trim() === "" && !attachedFile;
  };

  const createMessageElement = (message, sender) => {
    const messageWrapper = document.createElement("div");
    messageWrapper.className = `flex items-start gap-3 w-full max-w-4xl mx-auto ${
      sender === "user" ? "justify-end" : "justify-start"
    }`;

    const avatar = document.createElement("div");
    avatar.className =
      "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg select-none";

    const messageBubble = document.createElement("div");
    messageBubble.className = `p-4 rounded-xl max-w-[85%] break-words message-bubble`;

    if (sender === "user") {
      avatar.textContent = "VC";
      avatar.className += " bg-blue-600 text-white order-2";
      messageBubble.className +=
        " bg-blue-600 text-white rounded-br-none order-1";
    } else {
      avatar.textContent = "AI";
      avatar.className += " bg-gray-600 text-gray-200";
      messageBubble.className += " bg-gray-700 text-gray-200 rounded-bl-none";
    }

    const sanitizedHtml = DOMPurify.sanitize(marked.parse(message || ""), {
      ADD_TAGS: ["button", "svg", "path", "pre", "code", "img"],
      ADD_ATTR: [
        "data-clipboard-target",
        "class",
        "id",
        "viewbox",
        "fill",
        "stroke",
        "stroke-width",
        "stroke-linecap",
        "stroke-linejoin",
        "points",
        "alt",
        "src",
      ],
    });
    messageBubble.innerHTML = sanitizedHtml;

    messageWrapper.appendChild(avatar);
    messageWrapper.appendChild(messageBubble);
    DOM.chatContainer.appendChild(messageWrapper);

    messageBubble.querySelectorAll(".copy-code-btn").forEach(addCopyListener);
    scrollToBottom();
  };

  const showTypingIndicator = () => {
    if (typingIndicatorElement) return;
    const indicatorHTML = `
                <div class="flex items-start gap-3 w-full max-w-4xl mx-auto justify-start ai-typing-indicator">
                    <div class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg select-none bg-gray-600 text-gray-200">AI</div>
                    <div class="p-4 rounded-xl bg-gray-700 rounded-bl-none flex items-center space-x-1">
                        <span class="typing-dot w-2 h-2 bg-gray-400 rounded-full"></span>
                        <span class="typing-dot w-2 h-2 bg-gray-400 rounded-full"></span>
                        <span class="typing-dot w-2 h-2 bg-gray-400 rounded-full"></span>
                    </div>
                </div>`;
    DOM.chatContainer.insertAdjacentHTML("beforeend", indicatorHTML);
    typingIndicatorElement = DOM.chatContainer.querySelector(
      ".ai-typing-indicator"
    );
    scrollToBottom();
  };

  const removeTypingIndicator = () => {
    if (typingIndicatorElement) {
      typingIndicatorElement.remove();
      typingIndicatorElement = null;
    }
  };

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast("A imagem é muito grande (máx: 5MB).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      DOM.imagePreview.src = e.target.result;
      DOM.imagePreviewContainer.classList.remove("hidden");
      attachedFile = e.target.result;
      checkSendButtonStatus();
      scrollToBottom();
    };
    reader.onerror = () => showToast("Erro ao ler a imagem.");
    reader.readAsDataURL(file);
  };

  DOM.promptInput.addEventListener("input", () => {
    adjustTextareaHeight();
    checkSendButtonStatus();
  });

  DOM.promptInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      DOM.chatForm.requestSubmit();
    }
  });

  DOM.promptInput.addEventListener("paste", (e) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.indexOf("image") !== -1) {
        const file = item.getAsFile();
        handleFile(file);
        e.preventDefault();
        break;
      }
    }
  });

  DOM.imageInput.addEventListener("change", (e) =>
    handleFile(e.target.files[0])
  );

  DOM.removeImageBtn.addEventListener("click", () => {
    DOM.imageInput.value = "";
    DOM.imagePreview.src = "";
    DOM.imagePreviewContainer.classList.add("hidden");
    attachedFile = null;
    checkSendButtonStatus();
  });

  DOM.chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const userMessageText = DOM.promptInput.value.trim();
    if (!userMessageText && !attachedFile) return;

    let finalMessageContent = userMessageText;

    if (attachedFile) {
      const imgHtml = `\n\n<img src="${attachedFile}" alt="Anexo" class="mt-2 rounded-lg max-w-full h-auto object-contain max-h-[250px]" />`;
      finalMessageContent += imgHtml;
    }

    if (finalMessageContent) {
      createMessageElement(finalMessageContent, "user");
    }

    socket.emit("enviar_mensagem", {
      mensagem: userMessageText,
      arquivo: attachedFile,
    });

    DOM.promptInput.value = "";
    DOM.removeImageBtn.click();
    adjustTextareaHeight();
    showTypingIndicator();
  });

  const addCopyListener = (button) => {
    if (button.dataset.listenerAttached) return;
    button.dataset.listenerAttached = "true";
    button.addEventListener("click", () => {
      const codeElement = document.querySelector(
        button.dataset.clipboardTarget
      );
      if (codeElement) {
        navigator.clipboard.writeText(codeElement.innerText).then(() => {
          const span = button.querySelector("span");
          const svg = button.querySelector("svg");
          const originalText = span.textContent;
          span.textContent = "Copiado!";
          svg.innerHTML =
            '<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>';
          svg.classList.add("text-green-400");
          setTimeout(() => {
            span.textContent = originalText;
            svg.innerHTML =
              '<path d="M7 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H7zM6 4a1 1 0 011-1h8a1 1 0 011 1v12a1 1 0 01-1 1H7a1 1 0 01-1-1V4z"></path>';
            svg.classList.remove("text-green-400");
          }, 2000);
        });
      }
    });
  };

  socket.on("connect", () => console.log("Conectado ao servidor Socket.IO"));
  socket.on("disconnect", () => showToast("Desconectado do servidor."));
  socket.on("connect_error", (err) =>
    showToast(`Erro de conexão: ${err.message}`)
  );

  socket.on("resposta_servidor", (data) => {
    removeTypingIndicator();
    if (data.resposta) createMessageElement(data.resposta, "ai");
    else showToast("Resposta inválida do servidor.");
  });

  const showWelcomeMessage = () => {
    createMessageElement(
      "**Olá! Seja bem-vindo ao TNL² CHAT.**\nComo posso te ajudar hoje?",
      "ai"
    );
  };

  showWelcomeMessage();
  adjustTextareaHeight();
  checkSendButtonStatus();
  DOM.promptInput.focus();
});
