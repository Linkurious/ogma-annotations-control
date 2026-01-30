class CommentBoxElement extends HTMLElement {
  constructor() {
    super();
    this.comments = [];
    this.attachShadow({ mode: "open" });
    this.render();
    this.setupEventListeners();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        * {
          box-sizing: border-box;
        }

        :host {
          display: block;
          font-family: "IBM Plex Sans", sans-serif;
          max-width: 400px;
          margin: 0 auto;
        }

        .comment-box {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          border: 1px solid #e9ecef;
        }

        .comment-input-container {
          position: relative;
          display: flex;
          align-items: flex-end;
          gap: 6px;
          padding: 16px;
          border-bottom: 1px solid #e9ecef;
        }

        .comment-textarea {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #e9ecef;
          border-radius: 6px;
          outline: none;
          font-family: "IBM Plex Sans", sans-serif;
          font-size: 14px;
          line-height: 1.4;
          resize: none;
          background: white;
          color: #333;
          transition: border-color 0.2s ease;
        }

        .comment-textarea:focus {
          border-color: #007bff;
        }

        .comment-textarea::placeholder {
          color: #6c757d;
        }

        .send-button {
          display: flex;
          align-items: center;
          justify-content: center;
          align-self: start;
          width: 37px;
          height: 37px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: background-color 0.2s ease;
          flex-shrink: 0;
        }

        .send-button:hover {
          background: #0056b3;
        }

        .send-button:disabled {
          background: #6c757d;
          cursor: not-allowed;
        }

        .send-icon {
          width: 16px;
          height: 16px;
          fill: none;
          stroke: currentColor;
          stroke-width: 2;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .comments-list {
          max-height: 300px;
          overflow-y: auto;
        }

        .comment-item {
          padding: 16px;
          border-bottom: 1px solid #f1f3f4;
          background: white;
          animation: slideIn 0.3s ease;
        }

        .comment-item:last-child {
          border-bottom: none;
        }

        .comment-text {
          font-size: 14px;
          line-height: 1.4;
          color: #333;
          margin: 0;
          white-space: pre-wrap;
        }

        .comment-time {
          font-size: 12px;
          color: #6c757d;
          margin-top: 8px;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .empty-state {
          padding: 32px 16px;
          text-align: center;
          color: #6c757d;
          font-size: 14px;
        }
      </style>

      <div class="comment-box">
        <div class="comment-input-container">
          <textarea
            class="comment-textarea"
            placeholder="Add a comment..."
            rows="1"
          ></textarea>
          <button class="send-button" disabled>
            <svg class="send-icon" viewBox="0 0 24 24">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22,2 15,22 11,13 2,9"></polygon>
            </svg>
          </button>
        </div>
        <div class="comments-list">
          <div class="empty-state">No comments yet. Be the first to comment!</div>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    this.textarea = this.shadowRoot.querySelector(".comment-textarea");
    this.sendButton = this.shadowRoot.querySelector(".send-button");
    this.commentsList = this.shadowRoot.querySelector(".comments-list");

    this.textarea.addEventListener(
      "input",
      this.handleTextareaInput.bind(this)
    );
    this.textarea.addEventListener("keydown", this.handleKeydown.bind(this));
    this.sendButton.addEventListener(
      "click",
      this.handleSendComment.bind(this)
    );
  }

  handleTextareaInput() {
    const value = this.textarea.value.trim();

    // Enable/disable send button
    this.sendButton.disabled = !value;

    // Auto-resize textarea
    this.autoResizeTextarea();
  }

  handleKeydown(e) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (!this.sendButton.disabled) {
        this.handleSendComment();
      }
    }
  }

  autoResizeTextarea() {
    // Reset height to auto to get the actual scrollHeight
    this.textarea.style.height = "auto";

    // Calculate the new height (minimum 28px, maximum 120px)
    const minHeight = 28;
    const maxHeight = 120;
    const newHeight = Math.min(
      Math.max(this.textarea.scrollHeight, minHeight),
      maxHeight
    );

    this.textarea.style.height = newHeight + "px";

    // Show scrollbar if content exceeds maxHeight
    this.textarea.style.overflowY =
      this.textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  }

  handleSendComment() {
    const text = this.textarea.value.trim();
    if (!text) return;

    // Dispatch custom event with comment data
    this.dispatchEvent(
      new CustomEvent("comment-send", {
        detail: { text },
        bubbles: true,
        composed: true
      })
    );

    // Add comment to the list
    this.addComment(text);

    // Clear textarea and reset height
    this.textarea.value = "";
    this.textarea.style.height = "auto";
    this.autoResizeTextarea();
    this.sendButton.disabled = true;

    // Focus back to textarea
    this.textarea.focus();
  }

  addComment(text) {
    const comment = {
      id: Date.now(),
      text: text,
      timestamp: new Date()
    };

    this.comments.unshift(comment);
    this.renderComments();

    // Dispatch custom event when comment is added
    this.dispatchEvent(
      new CustomEvent("comment-added", {
        detail: { comment },
        bubbles: true,
        composed: true
      })
    );
  }

  renderComments() {
    if (this.comments.length === 0) {
      this.commentsList.innerHTML =
        '<div class="empty-state">No comments yet. Be the first to comment!</div>';
      return;
    }

    this.commentsList.innerHTML = this.comments
      .map(
        (comment) => `
      <div class="comment-item">
        <p class="comment-text">${this.escapeHtml(comment.text)}</p>
        <div class="comment-time">${this.formatTime(comment.timestamp)}</div>
      </div>
    `
      )
      .join("");
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  formatTime(date) {
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).format(date);
  }

  // Public API methods
  clearComments() {
    this.comments = [];
    this.renderComments();
  }

  getComments() {
    return [...this.comments];
  }

  setComments(comments) {
    this.comments = [...comments];
    this.renderComments();
  }

  // Attribute observation
  static get observedAttributes() {
    return ["placeholder", "max-height"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.textarea) return;

    switch (name) {
      case "placeholder": {
        this.textarea.placeholder = newValue || "Add a comment...";
        break;
      }
      case "max-height": {
        const maxHeight = parseInt(newValue) || 300;
        this.commentsList.style.maxHeight = maxHeight + "px";
        break;
      }
    }
  }

  connectedCallback() {
    // Apply initial attribute values
    if (this.hasAttribute("placeholder")) {
      this.textarea.placeholder = this.getAttribute("placeholder");
    }
    if (this.hasAttribute("max-height")) {
      const maxHeight = parseInt(this.getAttribute("max-height")) || 300;
      this.commentsList.style.maxHeight = maxHeight + "px";
    }
  }
}

// Register the custom element
customElements.define("comment-box", CommentBoxElement);

export { CommentBoxElement };
