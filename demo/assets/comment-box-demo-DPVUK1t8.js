import"./modulepreload-polyfill-B5Qt9EMX.js";class o extends HTMLElement{constructor(){super(),this.comments=[],this.attachShadow({mode:"open"}),this.render(),this.setupEventListeners()}render(){this.shadowRoot.innerHTML=`
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
    `}setupEventListeners(){this.textarea=this.shadowRoot.querySelector(".comment-textarea"),this.sendButton=this.shadowRoot.querySelector(".send-button"),this.commentsList=this.shadowRoot.querySelector(".comments-list"),this.textarea.addEventListener("input",this.handleTextareaInput.bind(this)),this.textarea.addEventListener("keydown",this.handleKeydown.bind(this)),this.sendButton.addEventListener("click",this.handleSendComment.bind(this))}handleTextareaInput(){const t=this.textarea.value.trim();this.sendButton.disabled=!t,this.autoResizeTextarea()}handleKeydown(t){t.key==="Enter"&&(t.metaKey||t.ctrlKey)&&(t.preventDefault(),this.sendButton.disabled||this.handleSendComment())}autoResizeTextarea(){this.textarea.style.height="auto";const t=28,e=120,s=Math.min(Math.max(this.textarea.scrollHeight,t),e);this.textarea.style.height=s+"px",this.textarea.style.overflowY=this.textarea.scrollHeight>e?"auto":"hidden"}handleSendComment(){const t=this.textarea.value.trim();t&&(this.dispatchEvent(new CustomEvent("comment-send",{detail:{text:t},bubbles:!0,composed:!0})),this.addComment(t),this.textarea.value="",this.textarea.style.height="auto",this.autoResizeTextarea(),this.sendButton.disabled=!0,this.textarea.focus())}addComment(t){const e={id:Date.now(),text:t,timestamp:new Date};this.comments.unshift(e),this.renderComments(),this.dispatchEvent(new CustomEvent("comment-added",{detail:{comment:e},bubbles:!0,composed:!0}))}renderComments(){if(this.comments.length===0){this.commentsList.innerHTML='<div class="empty-state">No comments yet. Be the first to comment!</div>';return}this.commentsList.innerHTML=this.comments.map(t=>`
      <div class="comment-item">
        <p class="comment-text">${this.escapeHtml(t.text)}</p>
        <div class="comment-time">${this.formatTime(t.timestamp)}</div>
      </div>
    `).join("")}escapeHtml(t){const e=document.createElement("div");return e.textContent=t,e.innerHTML}formatTime(t){return new Intl.DateTimeFormat("en-US",{hour:"2-digit",minute:"2-digit",second:"2-digit"}).format(t)}clearComments(){this.comments=[],this.renderComments()}getComments(){return[...this.comments]}setComments(t){this.comments=[...t],this.renderComments()}static get observedAttributes(){return["placeholder","max-height"]}attributeChangedCallback(t,e,s){if(this.textarea)switch(t){case"placeholder":{this.textarea.placeholder=s||"Add a comment...";break}case"max-height":{const n=parseInt(s)||300;this.commentsList.style.maxHeight=n+"px";break}}}connectedCallback(){if(this.hasAttribute("placeholder")&&(this.textarea.placeholder=this.getAttribute("placeholder")),this.hasAttribute("max-height")){const t=parseInt(this.getAttribute("max-height"))||300;this.commentsList.style.maxHeight=t+"px"}}}customElements.define("comment-box",o);
