let WebSocketServer = require('ws').Server, wss = new WebSocketServer({port: 8070});
let PLAYERS = [];
let ROOMS = [];
let CAPACITY = 2;
let timeout = 8000;
let timer, startTime;

function Room(id, capacity, safeSquares, data) {
    this.id = id;
    this.capacity = capacity;
    this.safeSquares = safeSquares;
    this.players = [];
    this.data = data;
}

function Player(ws, id, roomId, num, ready, absence, deleted) {
    this.ws = ws;
    this.id = id;
    this.roomId = roomId;
    this.num = num;
    this.ready = ready;
    this.absence = absence;
    this.deleted = deleted;
}

wss.SendDataToRoom = function broadcast(toRoomID, data, fromPlayer) {

    if ((fromPlayer && !fromPlayer.deleted) || fromPlayer === null) {

        wss.clients.forEach(function each(client) {

            let player = PLAYERS.find(e => (e.ws === client) && (e.roomId === toRoomID));

            if (player && (player !== fromPlayer || fromPlayer === null) && player.ready && !player.deleted) {
                client.send(JSON.stringify(data));
            }
        });

    } else {

        wss.client.send("Unauthorized Request!");

    }
};

wss.on('connection', function (ws, request, client) {

    print("Opened!");

    ws.on('message', function (message) {

        print(message);

        let msg = JSON.parse(message);

        if (msg.__Type === "JoinToRoomReq") {

            let room = ROOMS.find(e => e.id === msg.RoomID);

            if (room) {

                let player = room.players.find(e => e.id === msg.PlayerID);

                if (player) {

                    //Before, The disconnected user could reconnect from here.
                    //but now the codes of that action migrated to the <PlayerBackReq>
                    ws.send("The player Already Exists!");

                } else {

                    if (room.capacity > room.players.length) {

                        let player = new Player(ws, msg.PlayerID, msg.RoomID, room.players.length + 1, 1, 0, 0);
                        0

                        room.players.push(player);

                        PLAYERS.push(player);

                        if (player) {

                            ws.send(JSON.stringify({
                                "__Type": "JoinToRoomRes",
                                "Settings": {
                                    "Capacity": room.capacity
                                },
                                "SafeSquares": room.safeSquares,
                                "PlayerNumber": player.num,
                                "Player": {
                                    "Name": "Ali",
                                    "Avatar": 254
                                }
                            }));

                        } else {

                            print("Error: An Error Has Occurred.");

                        }

                        if (room.capacity === room.players.length) {

                            wss.SendDataToRoom(room.id, {
                                "__Type": "GameStart",
                                "Players": [
                                    {
                                        "Name": "Ali",
                                        "Avatar": ""
                                    },
                                    {
                                        "Name": "Mosi",
                                        "Avatar": ""
                                    },
                                ]
                            }, null);

                            let turnedPlayer = room.players.find(e => e.num === 1);

                            startTimer(turnedPlayer, room);

                        }
                    } else {

                        print(" The Room is Full!");

                    }

                }


            } else {

                let room = new Room(msg.RoomID, CAPACITY, 1, {
                    "__Type": "RoomDataReq",
                    "Turn": 1,
                    "Dice": 0,
                    "GameState": null
                });

                ROOMS.push(room);

                let player = new Player(ws, msg.PlayerID, msg.RoomID, room.players.length + 1, 1, 0, 0);

                room.players.push(player);

                PLAYERS.push(player);

                if (player) {

                    ws.send(JSON.stringify({
                        "__Type": "JoinToRoomRes",
                        "Settings": {
                            "Capacity": room.capacity
                        },
                        "SafeSquares": room.safeSquares,
                        "PlayerNumber": player.num,
                        "Player": {
                            "Name": "Ali",
                            "Avatar": 254
                        }
                    }));

                } else {

                    print("Error: An Error Has Occurred.");

                }

            }
        }

        else if (msg.__Type === "DiceRolledReq") {

            let player = PLAYERS.find(e => e.ws === ws);

            if (player && !player.deleted) {

                let room = ROOMS.find(e => e.id === player.roomId);

                if (room) {

                    wss.SendDataToRoom(player.roomId, {
                        "Dice": msg.Dice,
                        "PlayerNumber": player.num,
                        "__Type": "DiceRolledRes"
                    }, player);

                }

            }

        }

        else if (msg.__Type === "RoomDataReq") {

            clearTimeout(timer);

            let player = PLAYERS.find(e => e.ws === ws);

            if (player && !player.deleted) {

                let room = ROOMS.find(e => e.id === player.roomId);

                if (room) {

                    room.data = msg;

                    let turnedPlayer = room.players.find(e => e.num === parseInt(msg.Turn));

                    //Calculate Player Absence
                    startTimer(turnedPlayer, room);

                }

            }

        }

        else if (msg.__Type === "PlayerBackReq") {

            let player = PLAYERS.find(e => e.ws === ws);

            if (player && !player.deleted) {

                if (player.ready) {

                    let room = ROOMS.find(e => e.id === player.roomId);

                    if (room) {

                        room.data.__Type = "PlayerBackRes";
                        room.data.ElapsedTime = (new Date().getTime() - startTime) / 1000;
                        ws.send(JSON.stringify(room.data));

                    }
                }
                else {

                    let room = ROOMS.find(e => e.id === msg.RoomID);

                    if (room) {

                        let player = room.players.find(e => e.id === msg.PlayerID);

                        if (player) {

                            player.ready = 1;
                            player.ws = ws;

                            room.data.__Type = "PlayerBackRes";
                            ws.send(JSON.stringify(room.data));

                        }

                    }

                }

            } else if (!player.deleted) {

                //Duplicate

                let room = ROOMS.find(e => e.id === msg.RoomID);

                if (room) {

                    let player = room.players.find(e => e.id === msg.PlayerID);

                    if (player) {

                        player.ready = 1;
                        player.ws = ws;

                        room.data.__Type = "PlayerBackRes";
                        ws.send(JSON.stringify(room.data));

                    }

                }

            }

        }

        else if (msg.__Type === "PlayerMovedReq") {

            let player = PLAYERS.find(e => e.ws === ws);

            if (player && !player.deleted) {

                let room = ROOMS.find(e => e.id === player.roomId);

                if (room) {

                    wss.SendDataToRoom(player.roomId, {
                        "__Type": "PlayerMovedRes",
                        "PlayerNumber": player.num,
                        "Pawn": msg.Pawn,
                        "StepCount": msg.StepCount
                    }, player);

                }

            }

        }

        else if (msg.__Type === "ResignReq") {

            let player = PLAYERS.find(e => e.ws === ws);

            if (player && !player.deleted) {

                let room = ROOMS.find(e => e.id === player.roomId);

                if (room) {

                    wss.SendDataToRoom(player.roomId, {
                        "__Type": "ResignUpdate",
                        "PlayerNumber": player.num
                    }, player);

                    player.deleted = 1;

                }

            }

        }

    });

    ws.on('close', function (message) {

        /*print("Closed!");

        let player = PLAYERS.find(e => e.ws === ws);

        if (player) {

            player.ready = 0;

        } else {

            print("The User Doesn't Exists!");

        }*/

        PLAYERS.forEach(function (player) {
            player = null;
        });

        ROOMS.forEach(function (room) {
            room = null;
        });

        PLAYERS = [];
        ROOMS = [];

        clearTimeout(timer);


    })

});

function print(message) {

    let date = new Date();
    console.log("\n" +
        date.getHours() + ":" +
        date.getMinutes() + ":" +
        date.getSeconds() + ":" +
        date.getMilliseconds() + " => " +
        message);

}

function nextTurn(players, turn) {

    let presentPlayers = [];

    players.forEach(function (player, i) {
        if (!player.deleted) {
            presentPlayers[i] = player.num;
        }
    });

    let index = presentPlayers.indexOf(turn);

    if (index >= presentPlayers.length - 1)
        index = 0;
    else
        index++;

    return presentPlayers[index];

}

function startTimer(player, room) {
    if (player && !player.deleted) {

        startTime = (new Date()).getTime();

        timer = setTimeout(function () {

            player.absence++;
            console.log(player.num + " Absence: " + player.absence);

            let newTurn = nextTurn(room.players, room.data.Turn);

            wss.SendDataToRoom(player.roomId, {
                "__Type": "TurnSkipped",
                "GameState": room.data.GameState,
                "Dice": room.data.Dice,
                "Turn": newTurn
            }, null);

            room.data.Turn = newTurn;
            room.data.ElapsedTime = 0;

            if (player.absence >= 3) {

                player.deleted = 1;

                wss.SendDataToRoom(player.roomId, {
                    "__Type": "ResignUpdate",
                    "PlayerNumber": player.num
                }, null);

                console.log(player.num + ": OUT!");
            }

            //start new round for next player
            let playerNum = nextTurn(room.players, room.data.Turn);
            clearTimeout(timer);
            startTimer(room.players.find(e => e.num === playerNum), room);

        }, timeout, player);
    }

}





