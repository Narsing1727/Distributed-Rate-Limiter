
const cluster = require("cluster");
const os = require("os");

const numCPUs = os.cpus().length;

if (cluster.isPrimary) {

  console.log(`Master ${process.pid} running`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork();
  });

}
else{


const express = require("express");
const apiRoutes = require("./routes/api");
const { register } = require("./metrics/metrics");
const app = express();
const analyticsRoutes = require("./routes/analytics");


app.use(express.json());
app.use("/api", apiRoutes);

const PORT = process.env.PORT || 3000;

app.use("/analytics", analyticsRoutes);
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});
app.get("/api/test", (req, res) => {
  res.json({
    message: "API working",
    served_by: os.hostname()
  });
});
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
}