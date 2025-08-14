import express from "express";
import http from 'http';
import { Server } from "socket.io";
import path from "path";
import { version } from "os";
import axios from "axios";


const app = express();

const server = http.createServer(app);

//Save time while opening again
// const url = `https://code-mantra-ylgq.onrender.com`;
// const interval = 30000;

// function reloadWebsite() {
//   axios
//     .get(url)
//     .then((response) => {
//       console.log("website reloded");
//     })
//     .catch((error) => {
//       console.error(`Error : ${error.message}`);
//     });
// }

// setInterval(reloadWebsite, interval);



const io = new Server(server, {
    cors: {
        origin: "*",
    },
});

const rooms = new Map();

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    let currentRoom = null;
    let currentUser = null;


    socket.on("join", ({roomId, userName}) => {
        if(currentRoom){
            socket.leave(currentRoom);
            rooms.get(currentRoom).users.delete(currentUser);
            io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom).users))
        }

        currentRoom = roomId;
        currentUser = userName;

        socket.join(roomId);

        if(!rooms.has(roomId)){
            rooms.set(roomId, {users: new Set(), code: "//start coding here"});
        }

        rooms.get(roomId).users.add(userName);

        socket.emit("codeUpdate", rooms.get(roomId).code);

        io.to(roomId).emit("userJoined", Array.from(rooms.get(currentRoom).users));
    })

    socket.on("codeChange", ({ roomId,code }) => {
        if(rooms.has(roomId)){
            rooms.get(roomId).code = code;
        }
        socket.to(roomId).emit("codeUpdate", code)
    })


    socket.on("leaveRoom", () => {
        if(currentRoom && currentUser){
            rooms.get(currentRoom).users.delete(currentUser);
            io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom).users));

            socket.leave(currentRoom)
            currentRoom = null;
            currentUser = null;
        }
    })

    socket.on("typing", ({roomId, userName}) => {
        socket.to(roomId).emit("userTyping", userName);
    })

    socket.on("languageChange", ({roomId, language}) => {
        io.to(roomId).emit("languageUpdate", language);
    })

    //Adding compiler
    //Using piston api
    socket.on("compileCode", async({code, roomId, language, version}) => {
        if(rooms.has(roomId)){
            const room = rooms.get(roomId);
            const response = await axios.post("https://emkc.org/api/v2/piston/execute", {
                language,
                version,
                files: [
                    {
                        content: code
                    }
                ]
            })

            room.output = response.data.run.output
            io.to(roomId).emit("codeResponse", response.data);
        }
    })

    socket.on("disconnect", () => {
        if(currentRoom && currentUser){
            rooms.get(currentRoom).users.delete(currentUser);
            io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom).users));
        }
        console.log(`User disconnected!!`);
    })
})


const port = process.env.PORT || 3000;

const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, "frontend/dist")))

app.get("*", (req,res) => {
    res.sendFile(path.join(__dirname, "frontend", "dist", "index.html"))
})

server.listen(port, () => {
    console.log(`Server is working on port ${port}`);
})