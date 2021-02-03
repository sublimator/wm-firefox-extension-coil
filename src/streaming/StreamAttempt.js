// @ts-check

import { getFarFutureExpiry, timeout } from "../utils.js";

import { Buffer } from "https://jspm.dev/npm:buffer@6.0.3";
import { createConnection } from "https://jspm.dev/npm:ilp-protocol-stream@2.6.5";

const UPDATE_AMOUNT_TIMEOUT = 2000;

export class StreamAttempt {
  /** @param {IStreamAttempt.StreamAttemptOptions} opts */
  constructor(opts) {
    this._onMoney = opts.onMoney;
    this._bandwidth = opts.bandwidth;
    this._plugin = opts.plugin;
    this._spsp = opts.spspDetails;

    this._active = true;
    this._lastDelivered = 0;
  }

  async start() {
    console.debug("StreamAttempt.start()");
    if (!this._active) return;
    const plugin = this._plugin;

    console.debug("creating ilp/stream connection.");
    this._connection = await createConnection({
      destinationAccount: this._spsp.destinationAccount,
      sharedSecret: Buffer.from(this._spsp.sharedSecret, "base64"),
      plugin,
      slippage: 1.0,
      exchangeRate: 1.0,
      maximumPacketAmount: "10000000",
      getExpiry: getFarFutureExpiry,
    });

    if (!this._active) return;

    // send practically forever at allowed bandwidth
    console.debug("attempting to send on connection.");
    this._ilpStream = this._connection.createStream();

    // TODO: if we save the tier from earlier we don't need to do this async
    // TODO: does doing this async allow a race condition if we stop right away
    const initialSendAmount = await this._bandwidth.getStreamSendMax();
    this._ilpStream.setSendMax(initialSendAmount);

    return new Promise((resolve, reject) => {
      const onMoney = (/** @type {string} */ sentAmount) => {
        // Wait until `setImmediate` so that `connection.totalDelivered` has been updated.
        const receipt = this._ilpStream.receipt?.toString("base64");
        setImmediate(this.onMoney.bind(this), sentAmount, receipt);
      };

      const onPluginDisconnect = async () => {
        console.debug("onPluginDisconnect()");
        cleanUp();
        console.debug(
          "this._ilpStream.isOpen()",
          this._ilpStream.isOpen(),
          "this._connection['closed']",
          this._connection["closed"],
          "this._plugin.isConnected()",
          this._plugin.isConnected()
        );

        if (this._ilpStream.isOpen()) {
          this._ilpStream.destroy();
        }

        if (!this._connection["closed"]) {
          console.debug("waiting connection destroy");
          await this._connection.destroy();
          console.debug("connection destroyed");
        }

        if (plugin.isConnected()) {
          console.debug("waiting plugin disconnect");
          await plugin.disconnect();
          console.debug("plugin disconnected");
        }

        // resolve instead of reject to avoid delay
        console.debug("resolving");
        resolve();
      };

      const onConnectionError = err => {
        console.error("onConnectionError");
        console.error(err);
        cleanUp();
        reject(err);
      };

      const onUpdateAmountTimeout = async () => {
        // we set this before the async operation to prevent any race
        // conditions on cleanup
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        updateAmountTimeout = setTimeout(
          onUpdateAmountTimeout,
          UPDATE_AMOUNT_TIMEOUT
        );

        if (this._ilpStream.isOpen()) {
          const sendAmount = await this._bandwidth.getStreamSendMax();
          this._ilpStream.setSendMax(sendAmount);
        }
      };

      const cleanUp = () => {
        console.debug("cleanup()");
        this._ilpStream.removeListener("outgoing_money", onMoney);
        this._connection.removeListener("error", onConnectionError);
        plugin.removeListener("disconnect", onPluginDisconnect);
        clearTimeout(updateAmountTimeout);
      };

      plugin.once("disconnect", onPluginDisconnect);
      this._ilpStream.on("outgoing_money", onMoney);
      this._connection.once("error", onConnectionError);
      let updateAmountTimeout = setTimeout(
        onUpdateAmountTimeout,
        UPDATE_AMOUNT_TIMEOUT
      );
    });
  }

  async stop() {
    this._active = false;
    if (!this._connection) return;

    console.debug("initiating stream shutdown");
    if (this._ilpStream.isOpen()) {
      // Stop it sending any more than is already sent
      this._ilpStream.setSendMax(this._ilpStream.totalSent);
    }
    await this.waitHoldsUptoMs(2e3);
    await new Promise(resolve => {
      console.debug("severing ilp/stream connection.");
      this._ilpStream.once("close", resolve);
      this._ilpStream.destroy();
    });
    console.debug(
      "stream close event fired; plugin connected=",
      this._plugin.isConnected()
    );
    await this._connection.end();
    console.debug("connection destroyed");
    // stream createConnection() automatically closes the plugin as of
    // time of writing: https://github.com/interledgerjs/ilp-protocol-stream/blob/9b49b1cad11d4b7a71fb31a8da61c729fbba7d9a/src/index.ts#L69-L71
    if (this._plugin.isConnected()) {
      console.debug("disconnecting plugin");
      await this._plugin.disconnect();
      console.debug("plugin disconnected");
    }
  }

  getTotalSent() {
    return this._ilpStream ? this._ilpStream.totalSent : "0";
  }

  /**
   * @private
   * @param {string} sentAmount
   * @param {string=} receipt
   */
  onMoney(sentAmount, receipt) {
    const delivered = Number(this._connection.totalDelivered);
    const amount = delivered - this._lastDelivered;
    console.debug("delivered", delivered, "lastDelivered", this._lastDelivered);
    this._lastDelivered = delivered;

    this._onMoney({
      sentAmount,
      // dest=received
      amount,
      assetCode: this._connection.destinationAssetCode,
      assetScale: this._connection.destinationAssetScale,
      receipt,
      // source=source
      sourceAmount: sentAmount,
      sourceAssetCode: this._connection.sourceAssetCode,
      sourceAssetScale: this._connection.sourceAssetScale,
    });
  }

  /**
   * private
   * @param {number} totalMs
   */
  async waitHoldsUptoMs(totalMs) {
    while (totalMs > 0) {
      const holds = Object.keys(this._ilpStream["holds"]).length;
      console.debug({ holds: holds });
      if (holds === 0) {
        break;
      } else {
        await timeout(100);
        totalMs -= 100;
      }
    }
  }
}
