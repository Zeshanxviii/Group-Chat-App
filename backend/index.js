import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8000 });
const maxClients = 2;
let rooms = {};

wss.on('connection', function connection(ws) {
  ws.on('message', function message(data) {
    let obj;
    try {
      obj = JSON.parse(data);
    } catch (err) {
      console.warn("Invalid JSON:", data);
      return;
    }

    const type = obj.type;
    const params = obj.params;

    switch (type) {
      case "create":
        create(ws);
        break;
      case "join":
        join(ws, params);
        break;
      case "leave":
        leave(ws);
        break;
      case "message":
        handleMessage(ws, params);
        break;
      default:
        console.warn(`Unknown type: ${type}`);
        break;
    }
  });

  ws.on('close', () => {
    if (ws.room) {
      leave(ws);
    }
  });
});

// === Room & Client Functions ===

function create(ws) {
  const room = genKey(5);
  rooms[room] = [ws];
  ws.room = room;

  generalInformation(ws);
}

function join(ws, params) {
  const room = params.code;
  if (!rooms[room]) {
    ws.send(JSON.stringify({ type: "error", params: { message: "Room not found" } }));
    return;
  }

  if (rooms[room].length >= maxClients) {
    ws.send(JSON.stringify({ type: "error", params: { message: "Room is full" } }));
    return;
  }

  rooms[room].push(ws);
  ws.room = room;

  generalInformation(ws);
  broadcast(room, {
    type: "system",
    params: { message: "A new user has joined the room." }
  }, ws);
}

function leave(ws) {
  const room = ws.room;
  if (!room || !rooms[room]) return;

  rooms[room] = rooms[room].filter(client => client !== ws);
  ws.room = undefined;

  if (rooms[room].length === 0) {
    delete rooms[room];
  } else {
    broadcast(room, {
      type: "system",
      params: { message: "A user has left the room." }
    });
  }
}

function handleMessage(ws, params) {
  const room = ws.room;
  if (!room || !rooms[room]) return;

  broadcast(room, {
    type: "message",
    params: {
      message: params.message
    }
  }); // exclude the sender (optional)
  //ws varaible as the third argument to exclude the sender
}

function generalInformation(ws) {
  if (ws.room !== undefined) {
    const obj = {
      type: "info",
      params: {
        room: ws.room,
        "no-clients": rooms[ws.room]?.length || 0
      }
    };
    ws.send(JSON.stringify(obj));
  } else {
    ws.send(JSON.stringify({
      type: "info",
      params: { room: "no room" }
    }));
  }
}

function broadcast(room, msgObj, excludeWs = null) {
  const clients = rooms[room];
  if (!clients) return;

  const message = JSON.stringify(msgObj);
  clients.forEach(client => {
    if (client.readyState === 1 && client !== excludeWs) {
      client.send(message);
    }
  });
}

function genKey(length) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(
      Math.floor(Math.random() * characters.length));
  }
  return result;
}
