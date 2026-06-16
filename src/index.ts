export type Statement = {
  id: string;
  time: number;
  description: string;
  mcc: number;
  originalMcc: number;
  amount: number;
  operationAmount: number;
  currencyCode: number;
  commissionRate: number;
  cashbackAmount: number;
  balance: number;
  hold: boolean;
  receiptId?: string;
};

/**
 * Error thrown when the Monobank API responds with a non-2xx status.
 *
 * Successful responses return JSON; errors return `{ "errorDescription": string }`.
 * The one exception is the AWS-level 403 block, whose body is an HTML page or the
 * plain-text message "glory to Ukraine!" — in that case `errorDescription` is
 * undefined and the raw response is kept in `body`.
 */
export class MonobankApiError extends Error {
  readonly status: number;
  readonly errorDescription?: string;
  readonly body: string;

  constructor(status: number, errorDescription: string | undefined, body: string) {
    super(
      errorDescription ?? `Monobank API request failed with status ${status}`
    );
    this.name = "MonobankApiError";
    this.status = status;
    this.errorDescription = errorDescription;
    this.body = body;
  }

  /**
   * Rate limit exceeded. Monobank allows at most one request per 60 seconds to
   * the `client-info` and `statement` endpoints.
   */
  get isRateLimited(): boolean {
    return this.status === 429;
  }

  /**
   * Forbidden — usually an AWS-level block triggered by excessive activity from
   * your IP address. Such blocks typically last 24 hours and cannot be lifted by
   * the bank or the community.
   */
  get isForbidden(): boolean {
    return this.status === 403;
  }
}

export class MonobankApi {
  private apiKey: string;
  private baseUrl = "https://api.monobank.ua";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(path: string): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        headers: {
          "X-Token": this.apiKey,
        },
      });
    } catch (cause) {
      throw new MonobankApiError(
        0,
        `Network error while requesting ${path}: ${
          cause instanceof Error ? cause.message : String(cause)
        }`,
        ""
      );
    }

    const body = await res.text();

    if (!res.ok) {
      let errorDescription: string | undefined;
      try {
        const parsed = JSON.parse(body);
        if (parsed && typeof parsed.errorDescription === "string") {
          errorDescription = parsed.errorDescription;
        }
      } catch {
        // Non-JSON error body (e.g. the AWS 403 HTML page or plain-text block
        // message). Leave errorDescription undefined and keep the raw body.
      }
      throw new MonobankApiError(res.status, errorDescription, body);
    }

    try {
      return JSON.parse(body) as T;
    } catch (cause) {
      throw new MonobankApiError(
        res.status,
        `Failed to parse Monobank API response as JSON: ${
          cause instanceof Error ? cause.message : String(cause)
        }`,
        body
      );
    }
  }

  async clientInfo() {
    return this.request<unknown>("/personal/client-info");
  }

  async getStatements({
    account,
    from,
    to,
  }: {
    account: string;
    from: string;
    to: string;
  }) {
    return this.request<Statement[]>(
      `/personal/statement/${account}/${from}/${to}`
    );
  }
}
