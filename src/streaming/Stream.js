// @ts-check
import { timeout } from "../utils.js";
import { AdaptiveBandwidth } from "./AdaptiveBandwidth.js";
import { StreamAttempt } from "./StreamAttempt.js";

import { Buffer } from "https://jspm.dev/npm:buffer@6.0.3";
import IlpPluginBtp from "https://jspm.dev/npm:ilp-plugin-btp@1.4.2";

const BTP_ENDPOINT = "btp+wss://coil.com/btp";

// let ATTEMPT = 0;

export class Stream {
  /** @type {number} */
  _lastOutgoingMs = null;
  /** @type {number} */
  _packetNumber = null;

  /**
   * @param {string} btpToken
   * @param {SPSPResponse} spspResponse
   * @param {(event: IStream.StreamMoneyEvent) => void} emitMoney
   */
  constructor(btpToken, spspResponse, emitMoney) {
    this._btpToken = btpToken;
    this._spsp = spspResponse;
    this._emitMoney = emitMoney;

    this._assetCode = "";
    this._assetScale = 0;
    this._exchangeRate = 1;

    this._active = false;
    this._looping = false;
    /**@type {StreamAttempt} */
    this._attempt = null;
    this._lastDelivered = 0;
  }

  async start() {
    console.debug("Stream.start()");
    if (this._active) return;
    this._active = true;

    // reset this upon every start *before* early exit while _looping
    this._packetNumber = 0;

    if (this._looping) return;
    this._looping = true;

    if (this._attempt) {
      this._attempt.stop();
      this._attempt = null;
    }

    // Hack for for issue #144
    // Let pause() stream when tab is backgrounded have a chance to
    // to work to avoid wasted refreshBtpToken/SPSP queries
    await timeout(1);
    if (!this._active) {
      this._looping = false;
      return;
    }

    // reset our timer when we start streaming.
    const bandwidth = new AdaptiveBandwidth();

    while (this._active) {
      /** @type {string | undefined} */
      let btpToken = this._btpToken;
      let plugin, attempt;
      try {
        plugin = await this._makePlugin(btpToken);
        // console.debug(`StreamAttempt: ${this._sessionId}: ${++ATTEMPT}`);
        attempt = this._attempt = new StreamAttempt({
          bandwidth,
          onMoney: this.onMoney.bind(this),
          plugin,
          spspDetails: this._spsp,
        });
        if (this._active) {
          await attempt.start();
          await timeout(1000);
        }
      } catch (err) {
        const { ilpReject } = err;
        if (
          btpToken &&
          ilpReject &&
          ilpReject.message === "exhausted capacity." &&
          ilpReject.data.equals(await sha256(btpToken))
        ) {
          console.error(
            "anonymous token exhausted; should retry, err=%s",
            err.message
          );
          // this._anonTokens.removeToken(btpToken);
          continue;
        }
        console.error("error streaming. retry in 2s. err:");
        console.error(err);
        if (this._active) await timeout(2000);
      } finally {
        if (attempt) bandwidth.addSentAmount(attempt.getTotalSent());
        if (plugin) await plugin.disconnect();
      }
    }

    this._looping = false;
    console.debug("aborted because stream is no longer active.");
  }

  /**
   * @param {string} btpToken
   */
  async _makePlugin(btpToken) {
    // these are interspersed in order to not waste time if connection
    // is severed before full establishment
    if (!this._active) throw new Error("aborted monetization");

    const plugin = new IlpPluginBtp({
      server: BTP_ENDPOINT,
      btpToken,
    });

    console.debug("connecting ilp plugin. server=", BTP_ENDPOINT);
    // createConnection(...) does this, so this is somewhat superfluous
    await plugin.connect();
    return plugin;
  }

  /** @param {IStream.OnMoneyEvent} data */
  onMoney(data) {
    if (data.amount <= 0) return;

    const now = Date.now();
    const msSinceLastPacket = now - this._lastOutgoingMs;
    this._lastOutgoingMs = now;
    /** @type {IStream.StreamMoneyEvent} */
    const event = Object.assign(data, {
      packetNumber: this._packetNumber++,
      msSinceLastPacket: msSinceLastPacket,
      amount: data.amount.toString(),
      receipt: data.receipt,
    });
    this._assetCode = data.assetCode;
    this._assetScale = data.assetScale;
    this._exchangeRate = this._getExchangeRate(data);
    this._emitMoney(event);
  }

  _getExchangeRate({ amount, sourceAmount, assetScale, sourceAssetScale }) {
    return (
      (Number(amount) / Number(sourceAmount)) *
      (10 ** assetScale / 10 ** sourceAssetScale)
    );
  }

  async stop() {
    this._active = false;
    if (this._attempt) {
      await this._attempt.stop();
      this._attempt = null;
    }
  }

  async pause() {
    this.stop();
  }

  async resume() {
    this.start();
  }

  getAssetDetails() {
    return {
      assetCode: this._assetCode,
      assetScale: this._assetScale,
      exchangeRate: this._exchangeRate,
    };
  }
}

/** @param {string} preimage */
async function sha256(preimage) {
  const preimageBuf = Buffer.from(preimage);
  const digest = await crypto.subtle.digest({ name: "SHA-256" }, preimageBuf);
  return Buffer.from(digest);
}
