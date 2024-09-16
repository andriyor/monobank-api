import { dateRange, delay } from "./utils";

type Statement = {
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

export class MonobankApi {
  private apiKey: string;
  private baseUrl = "https://api.monobank.ua";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async clientInfo() {
    const res = await fetch(`${this.baseUrl}/personal/client-info`, {
      headers: {
        "X-Token": this.apiKey,
      },
    })
    return res.json();
  }

  async getStatement({
    account,
    from,
    to,
  }: {
    account: string;
    from: string;
    to: string;
  }) {
    const res = await fetch(
      `${this.baseUrl}/personal/statement/${account}/${from}/${to}`,
      {
        headers: {
          "X-Token": this.apiKey,
        },
      }
    );
    const data: Statement[] = await res.json();
    return data;
  }

  async getAllStatement({
    account,
    from,
    to,
  }: {
    account: string;
    from: Date;
    to: Date;
  }) {
    const ranges = dateRange(from, to, 30);
    const result = [];
    for (let index = 0; index < ranges.length; index++) {
      const data = await this.getStatement({
        account: account,
        from: ranges[index].from,
        to: ranges[index].to,
      });
      result.push(...data.reverse());

      if (ranges.length !== 1 && index !== ranges.length - 1) {
        await delay(1000 * 60);
      }
    }
    return result;
  }
}
