// @ts-check
class BandwidthTiers {
  constructor() {
    this._BASE_TIER = 1;
    this._BANDWIDTH_MAP = [0, 100000, 150000, 250000];
  }

  async getBandwidth(_url) {
    return this._BANDWIDTH_MAP[this._BASE_TIER];
  }
}

export class AdaptiveBandwidth {
  constructor() {
    this._tiers = new BandwidthTiers();
    this.reset();
  }

  reset() {
    this._timeStarted = Date.now();
    this._sentAmount = 0;
    console.debug("reset amount parameters to 0");
  }

  addSentAmount(amount) {
    console.debug("adding sent amount of", amount);
    this._sentAmount += Number(amount) || 0;
  }

  async getStreamSendMax() {
    const time = Date.now();
    const timeElapsed = time - this._timeStarted;
    const secondsElapsed = timeElapsed / 1000;
    const bandwidth = await this._tiers.getBandwidth();
    const sendAmount = Math.floor(
      secondsElapsed * bandwidth - this._sentAmount
    );
    console.debug("current send amount is", sendAmount);
    return sendAmount;
  }
}
