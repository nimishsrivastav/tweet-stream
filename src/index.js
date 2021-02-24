const express = require('express');
const needle = require('needle');
const http = require('http');
const path = require('path');
const socketio = require('socket.io');
const bodyParser = require('body-parser');

require('dotenv').config();

const port = process.env.PORT || 9999;
const token = process.env.BEARER_TOKEN;
const rulesURL = 'https://api.twitter.com/2/tweets/search/stream/rules';
const streamURL = 'https://api.twitter.com/2/tweets/search/stream?tweet.fields=public_metrics&expansions=author_id';

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

const server = http.createServer(app);
const io = socketio(server);

app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../', 'client', 'index.html'));
});

const rules = [{ value: 'beatles' }];

// Get stream rules
async function getRules() {
  const response = await needle('get', rulesURL, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return response.body;
}

// Set stream rules
async function setRules() {
  const data = {
    add: rules
  }

  const response = await needle('post', rulesURL, data, {
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  });

  return response.body;
}

// Delete stream rules
async function deleteRules(rules) {
  if (!Array.isArray(rules.data)) {
    return null;
  }

  const ids = rules.data.map((rule) => rule.id);

  const data = {
    delete: {
      ids: ids
    }
  }

  const response = await needle('post', rulesURL, data, {
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  });

  return response.body;
}

// Stream tweets
function streamTweets(socket) {
  const stream = needle.get(streamURL, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  stream.on('data', (data) => {
    try {
      const json = JSON.parse(data);
      // console.log(json);
      socket.emit('tweet', json);
    } catch (error) {
    }
  });
}

io.on('connection', async () => {
  console.log('Client connected!');

  let currentRules;

  try {
    // Get all stream rules
    currentRules = await getRules();
    // Delete all stream rules
    await deleteRules(currentRules);
    // Set rules based on array above
    await setRules();
  } catch (error) {
    console.log(error);
    process.exit(1);
  }

  streamTweets(io);
});

server.listen(port, () => {
  console.log(`Server is running on port ${port}!`);
});