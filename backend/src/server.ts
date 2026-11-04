import { createApp } from './app.js';
import { createYahooClient } from './yahoo/yahoo-client.js';

const PORT = Number(process.env.PORT) || 3000;

const yahooClient = createYahooClient(fetch);
const app = createApp({ yahooClient });

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
