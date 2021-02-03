interface MonetizationAmount {
  value: string;
  assetScale: number;
  assetCode: string;
}

interface SPSPResponse {
  destinationAccount: string;
  sharedSecret: string;
  receiptsEnabled: boolean;
}

declare namespace browser {
  const monetization: ExtensionMonetization;

  type Callback = (...args: any[]) => void;

  interface WebExtEvt<C extends Callback = Callback> {
    addListener(listener: C): void;
    removeListener(listener: C): void;
    hasListener(listener: C): boolean;
  }

  type MonetizationStartCallback = (
    sessionId: string,
    spspResponse: SPSPResponse
  ) => void;

  interface ExtensionMonetization {
    onStart: WebExtEvt<MonetizationStartCallback>;
    onStop: WebExtEvt;

    onPause: WebExtEvt;
    onResume: WebExtEvt;

    refresh(sessionId: string): Promise<string>;

    completePayment(
      sessionId: string,
      amount: MonetizationAmount,
      receipt?: string
    ): void;
  }
}

class EventEmitter {
  removeListener(event: string, handler: Function): void;
  on(event: string, handler: Function): void;
  once(event: string, handler: Function): void;
}

declare module "https://jspm.dev/npm:buffer@6.0.3" {
  export class Buffer extends ArrayBuffer {
    static from(input: string | ArrayBufferLike, radix?: string): Buffer;
  }
}

declare module "https://jspm.dev/npm:ilp-plugin-btp@1.4.2" {
  export default class IlpPluginBtp extends EventEmitter {
    constructor({ server: string, btpToken: string });
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
  }
}

declare module "https://jspm.dev/npm:ilp-protocol-stream@2.6.5" {
  interface CreateConnectionOpts {
    destinationAccount: string;
    sharedSecret: import("https://jspm.dev/npm:buffer@6.0.3").Buffer;
    plugin: import("https://jspm.dev/npm:ilp-plugin-btp@1.4.2").default;
    slippage: number;
    exchangeRate: number;
    maximumPacketAmount: string;
    getExpiry(): Date;
  }
  export declare function createConnection(
    opts: CreateConnectionOpts
  ): Promise<Connection>;

  interface Connection extends EventEmitter {
    createStream(): ILPStream;
    destroy(): Promise<void>;
    end(): Promise<void>;

    totalDelivered: string;
    destinationAssetCode: string;
    destinationAssetScale: string | number;
    sourceAssetCode: string;
    sourceAssetScale: string | number;
  }

  interface ILPStream extends EventEmitter {
    setSendMax(amount: string | number): void;
    isOpen(): boolean;
    destroy(): void;

    totalSent: string | number;
    receipt?: {
      toString(radix: string): string;
    };
  }
}

namespace IStreamAttempt {
  export interface StreamAttemptOptions {
    spspDetails: SPSPResponse;
    bandwidth: import("./src/streaming/AdaptiveBandwidth.js").AdaptiveBandwidth;
    onMoney: (event: OnMoneyEvent) => void;
    plugin: import("https://jspm.dev/npm:ilp-plugin-btp@1.4.2").default;
  }
}

namespace IStream {
  interface StreamMoneyEvent {
    packetNumber: number;
    msSinceLastPacket: number;
    sentAmount: string;
    amount: string;
    assetCode: string;
    assetScale: number;
    sourceAmount: string;
    sourceAssetCode: string;
    sourceAssetScale: number;
    receipt?: string;
  }

  interface OnMoneyEvent {
    sentAmount: string;
    amount: number;
    assetCode: string;
    assetScale: number;
    sourceAmount: string;
    sourceAssetCode: string;
    sourceAssetScale: number;
    receipt?: string;
  }
}

declare function setImmediate(
  handler: TimerHandler,
  ...arguments: any[]
): number;
