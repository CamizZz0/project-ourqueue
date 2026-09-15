import "dotenv/config";
import app from "./src/app.js";
import { env } from "./src/config/env.js";

const PORT = env.PORT;

app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 OurQueue Server running on port ${PORT}`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  console.log(`=========================================`);
});

