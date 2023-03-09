const http = require("http")
const express = require("express")
const { Server } = require("socket.io")
const path = require("path")

const app = express()
const httpServer = http.createServer(app)
const io = new Server(httpServer)

app.use(express.static("public"))

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "index.html"))
})


io.on("connection", socket => {
    console.log(`socket ${socket.id} connected`)
    socket.on("disconnect", reason => {
        console.log(`socket ${socket.id} disconnected`)
    })
})

app.use((req, res) => {
    res.status(404).send("Sorry, that route does not exist")
})

const port = process.env.PORT || 3000
httpServer.listen(port, () => {
    console.log(`Server is listening on http://localhost:${port}`)
})