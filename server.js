const { app, redisClient } = require('./app');

const PORT = process.env.PORT || 8080;

async function start() {
  await redisClient.connect();
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

start();
