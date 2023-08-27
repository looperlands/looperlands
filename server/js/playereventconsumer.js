class PlayerEventConsumer {
  constructor() {
    if (this.constructor === PlayerEventConsumer) {
      throw new TypeError('Abstract class "PlayerEventConsumer" cannot be instantiated directly.');
    }
  }

  consume(event) {
    throw new TypeError('Method "consume" must be implemented.');
  }
}

exports.PlayerEventConsumer = PlayerEventConsumer;