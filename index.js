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
        // Send initial message
        let msg =
            "Hi there! \n\n" +
            "Select 1 to place an order \n" +
            "Select 99 to checkout order \n" +
            "Select 98 to see order history \n" +
            "Select 97 to see current order \n" +
            "Select 0 to cancel order "

        socket.emit("bot:resp", msg)

        // Load the session 
        let session = await Session.findById(sid).exec()
        console.log("session", session)
        if (session === null) {
            // Create a session if it doesn't exist and send the id
            session = await Session.create({
                orders: [{
                    meals: []
                }]
            })
            socket.emit("sid:set", session.id)
        }
        // Add the session id to the socket
        socket.sid = session.id
        console.log("session id", socket.sid)
    })

    socket.on("meals:get", async () => {
        console.log("get available meals")

        // Get all meals in the database
        const meals = await Meal.find().lean().exec()

        let msg = 
            "Select one of the following available meals: \n" +
            "Or Select 0 to cancel order.\n"

        meals.forEach((meal, i) => {
            msg += `${i + 1} ${meal.name} \n`
        })

        socket.emit("bot:resp", msg)
        socket.emit("meals:data", meals)

    })

    socket.on("order:place", async (meal, callback) => {
        console.log("Order placed", meal)
        let msg
        if (meal === null) {
            msg = 
                "Sorry that's not a part of the valid options.\n" +
                "Choose again?\n" +
                "Or Select 0 to cancel order"
            callback(false)
        } else {
            const session = await Session.findById(socket.sid).exec()
            
            // Add meal to current order and save it
            session.orders.at(-1).meals.push(meal)
            await session.save()
            
            console.log("order", session.orders.at(-1))

            msg = 
                "Your order has been added successfully.\n\n" +
                "Select 1 to place another order \n" +
                "Select 99 to checkout order \n" +
                "Select 98 to see order history \n" +
                "Select 97 to see current order \n" +
                "Select 0 to cancel order "
            callback(true)
        }
        socket.emit("bot:resp", msg)
        

    })

    socket.on("invalid", () => {
        console.log("invalid option")

        let msg =
            "Sorry that was an invalid option. Choose from one of the following:\n\n" +
            "Select 1 to place an order \n" +
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