import { createApp } from './app';

const port = Number(process.env.API_PORT ?? 3000);

createApp().listen(port, () => {
  console.log(`Streamhub Catalogue API listening on http://localhost:${port}`);
});
