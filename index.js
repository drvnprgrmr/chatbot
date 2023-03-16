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
        // Load the session from the database
        let session = await Session.findById(sid).exec()

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
            "Select 0 to cancel order.\n" +
            "Select 00 to exit menu\n\n"

        meals.forEach((meal, i) => {
            msg += `${i + 1} ${meal.name} \n`
        })

        socket.emit("bot:resp", msg)
        socket.emit("meals:data", meals)

    })

    // Get the current order and display it to the user
    socket.on("order:view", async () => {
        // Get the current user session and populate the meals
        const session = await Session
            .findById(socket.sid)
            .populate("orders.order.meal") 
            .exec()

        // Grab the most recent order
        const order = session.orders.at(-1).order
        console.log("current order", order)
        let msg = "Here's you're current order:\n"

        // Add each order to the message
        order.forEach(obj => {
            msg += `${obj.meal.name} x${obj.qty}\n`
        })
        
        // Send the message to the user
        socket.emit("bot:resp", msg)
    })

    socket.on("order:place", async (meal, callback) => {
        console.log("Order placed", meal)
        let msg
        if (meal === null) {
            // Get all meals in the database
            const meals = await Meal.find().lean().exec()

            msg = 
                "Sorry that's not a part of the valid options.\n" +
                "Select 0 to cancel order\n" + 
                "Select 00 to exit menu\n\n" +
                "Or choose again?\n" 
            
            // Show all meals again to the user
            meals.forEach((meal, i) => {
                msg += `${i + 1} ${meal.name} \n`
            })
            
            // Tell the client the meal order was not placed successfully
            callback(false)
        } else {
            // Get the current user session
            const session = await Session.findById(socket.sid).exec()
            
            // Get the current order
            const order = session.orders.at(-1).order

            // Check if user has already ordered the meal
            const obj_ind = order.findIndex((obj) => obj.meal.equals(meal._id))

            console.log("index", obj_ind)
            // If the user has already ordered the meal
            // Increase the quantity
            if (obj_ind !== -1) order[obj_ind].qty++

            // Else create a new order
            else order.push({ meal })

            // Save changes to the session
            await session.save()
            
            console.log("order", session.orders.at(-1).order)

            msg = 
                "Your meal has been added successfully to the order.\n\n" +
                "Select 1 to add another meal \n" +
                "Select 99 to checkout order \n" +
                "Select 98 to see order history \n" +
                "Select 97 to see current order \n" +
                "Select 0 to cancel order "
            
            // Tell the client the order was successful
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