let WebSocketServer = require('ws').Server,
    wss = new WebSocketServer({port: 8070});

let PLAYERS=[];
let ROOMS = [];
let isRoomFull = 0;
let playerNum = 0;

let id = 1;

function Room(id, isLive, capacity, safeSquares, joinedPlayers, data) {
    this.id = id;
    this.isLive = isLive;
    this.capacity = capacity;
    this.safeSquares = safeSquares;
    this.joinedPlayers = joinedPlayers;
    this.data = data;
}

function Player(connection, id, roomId, num, token) {
    this.connection = connection;
    this.id = id;
    this.roomId = roomId;
    this.num = num;
    this.token;
}

wss.SendDataToRoom = function broadcast(toRoomID, data, fromPlayer) {

    wss.clients.forEach(function each(client) {
        const pickedPlayer = PLAYERS[PLAYERS.findIndex(function getIndex(player) {
            return player.connection.id === client.id && player.roomId === toRoomID;
        })];

        if(pickedPlayer && (pickedPlayer !== fromPlayer || fromPlayer === null)) {
            client.send(JSON.stringify(data));
        }
    });
};


wss.on('connection', function(ws, request, client) {

    ws.id = id;
    id++;

    print("Opened! " + "(User: " + ws.id + ")");

    ws.on('message', function(message) {

        print(message + "(User: " + ws.id + ")");

        let msg = JSON.parse(message);

        if(msg.__Type === "JoinToRoomReq"){

            if(!PLAYERS.find(e => e.id === msg.PlayerID)){

                let pickedRoom = ROOMS[ROOMS.findIndex(function getIndex(value) {
                    return value.id === msg.RoomID;
                })];

                if(pickedRoom){

                    if(pickedRoom.capacity > pickedRoom.joinedPlayers){

                        pickedRoom.joinedPlayers++;

                        let token = Math.floor(Math.random() * 10000000);

                        let newPlayer = new Player(ws, msg.PlayerID, msg.RoomID, pickedRoom.joinedPlayers, token);

                        PLAYERS.push(newPlayer);

                        if(newPlayer){

                            ws.send(JSON.stringify({
                                "__Type": "JoinToRoomRes",
                                "RoomCapacity": pickedRoom.capacity,
                                "SafeSquares": pickedRoom.safeSquares,
                                "PlayerNumber": newPlayer.num,
                                "Player": {
                                    "Name": "Ali",
                                    "Avatar": "",
                                    "Token": token
                                }
                            }));

                        } else {

                            print("Error: An Error Has Occurred." + "(User: " + ws.id + ")");

                        }

                        if(pickedRoom.capacity === pickedRoom.joinedPlayers){

                            wss.SendDataToRoom(pickedRoom.id,{
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

                        }
                    } else{

                        print(" The Room is Full!" + "(User: " + ws.id + ")");

                    }

                } else {

                    let newRoom = new Room(msg.RoomID, 1, 2, 1, 0, {
                        "__Type":"RoomDataReq",
                        "Turn":0,
                        "Dice":0,
                        "GameState":null
                    });
                    ROOMS.push(newRoom);

                    newRoom.joinedPlayers++;

                    let token = Math.floor(Math.random() * 10000000);

                    let newPlayer = new Player(ws, msg.PlayerID, msg.RoomID, newRoom.joinedPlayers, token);

                    PLAYERS.push(newPlayer);

                    if(newPlayer){

                        ws.send(JSON.stringify({
                            "__Type": "JoinToRoomRes",
                            "RoomCapacity": newRoom.capacity,
                            "SafeSquares": newRoom.safeSquares,
                            "PlayerNumber": newPlayer.num,
                            "Player": {
                                "Name": "Ali",
                                "Avatar": "",
                                "Token": token.toString()
                            }
                        }));

                    } else {

                        print("Error: An Error Has Occurred." + "(User: " + ws.id + ")");

                    }

                }

            } else{

                print("Error: The Player Already Exists!" + "(User: " + ws.id + ")");

            }

        }

        if(msg.__Type === "DiceRolledReq") {

            let player = PLAYERS.find(e => e.connection.id === ws.id);

            if (player) {

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

        if(msg.__Type === "RoomDataReq"){

            let player = PLAYERS.find(e => e.connection.id === ws.id);

            if(player){

                let room = ROOMS.find(e => e.id === player.roomId);

                if(room){

                    room.data = msg;

                }

            }

        }

        if(msg.__Type === "PlayerBackReq"){

            let player = PLAYERS.find(e => e.connection.id === ws.id);

            if(player){

                let room = ROOMS.find(e => e.id === player.roomId);

                if(room){

                    room.data.__Type = "PlayerBackRes";
                    ws.send(JSON.stringify(room.data));

                }

            }

        }

        if(msg.__Type === "PlayerMovedReq"){

            let player = PLAYERS.find(e => e.connection.id === ws.id);

            if(player){

                let room = ROOMS.find(e => e.id === player.roomId);

                if(room) {

                    wss.SendDataToRoom(player.roomId, {
                        "__Type": "PlayerMovedRes",
                        "PlayerNumber": player.num,
                        "Pawn": msg.Pawn,
                        "StepCount": msg.StepCount
                    }, player);

                }

            }

        }
        
    });

    ws.on('close', function(message){

        print("Closed! " + "(User: " + ws.id + ")");

    });

    ws.on('error', function(message){

        print("Error! " + "(User: " + ws.id + ")");

    });

});

function print(message){

    let date = new Date();
    console.log("\n" +
        date.getHours() + ":" +
        date.getMinutes() + ":" +
        date.getSeconds() + ":" +
        date.getMilliseconds() + " => " +
        message);

}





