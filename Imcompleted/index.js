

let WebSocketServer = require('ws').Server, wss = new WebSocketServer({port: 8070});

let PLAYERS=[];
let ROOMS = [];
let isRoomFull = 0;
let playerNum = 0;

let id = 1;

function Room(id, isLive, capacity, safeSquares, players, data) {
    this.id = id;
    this.isLive = isLive;
    this.capacity = capacity;
    this.safeSquares = safeSquares;
    this.players = players;
    this.data = data;
}

function Player(ws, id, roomId, num) {
    this.ws = ws;
    this.roomId = roomId;
    this.num = num;
}

wss.SendDataToRoom = function broadcast(toRoomID, data, fromPlayer) {

    wss.clients.forEach(function each(client) {

        let player = PLAYERS.find(e => ( e.ws.id === client.id) && (e.roomId === toRoomID));

        if(player && (player !== fromPlayer || fromPlayer === null)) {
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

                let room = ROOMS.find(e => e.id === msg.RoomID);

                if(room){

                    if(room.capacity > room.players){

                        room.players++;

                        let newPlayer = new Player(ws, msg.PlayerID, msg.RoomID, room.players);

                        PLAYERS.push(newPlayer);

                        if(newPlayer){

                            ws.send(JSON.stringify({
                                "__Type": "JoinToRoomRes",
                                "Settings": {
                                    "Capacity": room.capacity
                                },
                                "SafeSquares": room.safeSquares,
                                "PlayerNumber": newPlayer.num,
                                "Player": {
                                    "Name": "Ali",
                                    "Avatar": 254
                                }
                            }));

                        } else {

                            print("Error: An Error Has Occurred." + "(User: " + ws.id + ")");

                        }

                        if(room.capacity === room.players){

                            wss.SendDataToRoom(room.id,{
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

                    newRoom.players++;

                    let newPlayer = new Player(ws, msg.PlayerID, msg.RoomID, newRoom.players);

                    PLAYERS.push(newPlayer);

                    if(newPlayer){

                        ws.send(JSON.stringify({
                            "__Type": "JoinToRoomRes",
                            "RoomCapacity": newRoom.capacity,
                            "SafeSquares": newRoom.safeSquares,
                            "PlayerNumber": newPlayer.num,
                            "Player": {
                                "Name": "Ali",
                                "Avatar": ""
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

            let player = PLAYERS.find(e => e.ws.id === ws.id);

            if (player) {

                let room = ROOMS.find(e => e.id === player.roomId);

                if (room) {

                    wss.SendDataToRoom(player.roomId, {
                        "Dice": msg.Dice,
                        "PlayerNumber": player.num,
                        "__Type": "DiceRolledRes"
                    }, player);

                }

            } else {

                print("Error: Player Doesn't Exists!" + "(User: " + ws.id + ")");

            }

        }

        if(msg.__Type === "RoomDataReq"){

            let player = PLAYERS.find(e => e.ws.id === ws.id);

            if(player){

                let room = ROOMS.find(e => e.id === player.roomId);

                if(room){

                    room.data = msg;

                }

            }

        }

        if(msg.__Type === "PlayerBackReq"){

            let player = PLAYERS.find(e => e.ws.id === ws.id);

            if(player){

                let room = ROOMS.find(e => e.id === player.roomId);

                if(room){

                    room.data.__Type = "PlayerBackRes";
                    ws.send(JSON.stringify(room.data));

                }

            }

        }

        if(msg.__Type === "PlayerMovedReq"){

            let player = PLAYERS.find(e => e.ws.id === ws.id);

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

        let player = PLAYERS.find(e => e.ws === ws);

        let room = ROOMS.find(e => e.id === player.roomId);

        PLAYERS.splice(PLAYERS.indexOf(player), 1);

        if(player.roomId !== "") {
            let theIndex = ROOMS.indexOf(room);
            ROOMS[theIndex].players--;
            if(ROOMS[theIndex].players < 1) {
                ROOMS.splice(theIndex, 1);}
        }
    })

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





