const http = require("http")
const express = require("express")
const { Server } = require("socket.io")
const path = require("path")

const connectDB = require("./connect-db")

const Meal = require("./models/meals")
const Session = require("./models/session")

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
        console.log(`socket ${socket.id} disconnected (${reason})`)
    })

    // Handle session
    socket.on("sid:get", async (sid) => {
        let session = await Session.findById(sid).lean().exec()

        if (session === null) {
            // Create a session if it doesn't exist and send the id
            session = await Session.create({})
            socket.emit("sid:set", session._id)
        }

        if (sid !== null) socket.emit("sid:set", "test set")
    })
    socket.on("msg:post", opt => {
        
        switch (opt) {
            case "0": {
                console.log("cancel order")
                break
            }

            case "1": {
                
                break
            }
            case "97": {
                console.log("see order")
                break
            }
            case "98": {
                console.log("see order history")
                break
            }
            case "99": {
                console.log("checkout order")
                break
            }
        
        }

    })

    socket.on("meals:get", async () => {
        console.log("get available meals")

        // Get all meals in the database
        const meals = await Meal.find().lean().exec()

        let msg = "Select one of the following available meals: \n\n"

        meals.forEach((meal, i) => {
            msg += `${i + 1} ${meal} \n`
        })

        socket.emit("bot:resp", msg)

    })

    socket.on("order:place", order => {
        
    })
    socket.on("invalid", () => {
        console.log("invalid option")

        let msg =
            "Sorry that was an invalid option. Choose from one of the following:\n\n" +
            "Select 1 to Place an order \n" +
            "Select 99 to checkout order \n" +
            "Select 98 to see order history \n" +
            "Select 97 to see current order \n" +
            "Select 0 to cancel order "

        socket.emit("bot:resp", msg)
    })
})

app.use((req, res) => {
    res.status(404).send("Sorry, that route does not exist")
})

const port = process.env.PORT || 3000
httpServer.listen(port, () => {
    console.log(`Server is listening on http://localhost:${port}`)
    connectDB()
})