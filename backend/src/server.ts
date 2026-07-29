import { app } from "@/app";
import { port } from "@/config";

app.listen(port, () => {
  console.info(`Backend listening on http://localhost:${port}`);
});
