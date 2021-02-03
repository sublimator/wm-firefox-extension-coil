// @ts-check
import { tokens } from "./auth.js";
import { Stream } from "./streaming/Stream.js";

/**
 * @typedef {"pending" | "active" | "stopped" | "paused"} State
 * @typedef {{ destinationAccount: string, sharedSecret: string, receiptsEnabled: boolean }} SpspResponse
 */

class Monetization {
  constructor() {
    /**
     * @private
     * @type {Map<string, { state: State, stream: import('./streaming/Stream.js').Stream }>}
     */
    this.sessions = new Map();
    this.tokens = tokens;
  }

  /**
   * @param {string} sessionId
   * @param {SpspResponse} spspResponse
   * @param {(amount: any, receipt?: string) => void} emitProgress
   */
  async start(sessionId, spspResponse, emitProgress) {
    if (!this.tokens.btpToken) {
      await this.tokens.init();
    }

    const onMoney = data => {
      console.log(data);
      const amount = {
        value: data.amount,
        assetCode: data.assetCode,
        assetScale: data.assetScale,
      };
      const receipt = data.receipt;
      emitProgress(amount, receipt);
    };
    const stream = new Stream(this.tokens.btpToken, spspResponse, onMoney);
    this.sessions.set(sessionId, { state: "pending", stream });
    stream.start();
    this.sessions.get(sessionId).state = "active";
  }

  stop(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.state = "stopped"; // more of a documentation
      session.stream.stop();
      this.sessions.delete(sessionId);
    }
  }

  pause(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session && session.state === "active") {
      session.state = "paused";
      session.stream.stop();
    }
  }

  resume(sessionId, restart) {
    const session = this.sessions.get(sessionId);
    if (session && session.state === "paused") {
      this.sessions.delete(sessionId);
      restart(sessionId);
    }
  }
}

export default new Monetization();
