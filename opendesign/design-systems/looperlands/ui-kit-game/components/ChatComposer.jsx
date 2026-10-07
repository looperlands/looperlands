// Source recreation: client/index.html chatbox (current checkout).
export function ChatComposer() {
  return <form onSubmit={event => event.preventDefault()}>
    <textarea className="gp" rows="4" maxLength="4000" aria-label="Chat message" placeholder="Write a message..."></textarea>
    <div className="chat-actions"><span className="gp">Enter to send · Shift+Enter for a new line</span><button className="gp" type="button">Send</button></div>
  </form>;
}
