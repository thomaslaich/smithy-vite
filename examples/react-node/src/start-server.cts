import { createWeatherServer } from "./server.cts";

const server = createWeatherServer();
server.listen(3000, "127.0.0.1", () => {
  console.log("Weather server listening on http://127.0.0.1:3000");
});
