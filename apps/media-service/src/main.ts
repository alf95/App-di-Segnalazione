import 'dotenv/config';
import { createApp } from './app';

const port = Number(process.env.PORT ?? 3002);
const app = createApp();

app.listen(port, () => {
  console.log(`media-service listening on port ${port}`);
});
