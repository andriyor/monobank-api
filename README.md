# monobank-api

## API Doc

[Monobank open API](https://api.monobank.ua/docs/index.html#tag/Kliyentski-personalni-dani/paths/~1personal~1webhook/post)

[API. Особистий кабінет](https://api.monobank.ua/index.html)

## Examples

clientInfo

```ts
const monobankApi = new MonobankApi("****");

monobankApi.clientInfo();
```

getStatement - accepts a date within 31 days

```ts
import { getUnixTime } from "date-fns";

const monobankApi = new MonobankApi("****");

const startDate = new Date("2024.9.1");
const endDate = new Date("2024.9.16");

monobankApi.getStatements({
  account: "****",
  from: getUnixTime(startDate).toString(),
  to: getUnixTime(endDate).toString(),
});
```

getAllStatement - handle arbitrary date range

```ts
const monobankApi = new MonobankApi("****");

const startDate = new Date("2024.1.1");
const endDate = new Date("2024.9.16");

monobankApi.getAllStatements({
  account: "****",
  from: startDate,
  to: endDate,
});
```


## TODO

- Handle cancellation of payment
