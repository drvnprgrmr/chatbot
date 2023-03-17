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

        // If it doesn't exist, create a session
        if (session === null) {
            session = await Session.create({
                orders: [
                    // Add the first order
                    { order: [] }
                ]
            })

            // Send the id to the client
            socket.emit("sid:set", session.id)
        }
        // Add the session id to the socket
        socket.sid = session.id
        console.log("session id", socket.sid)
    })

    // Get the list of available meals
    socket.on("meals:get", async () => {
        // Get all meals in the database
        const meals = await Meal.find().lean().exec()

        let msg = "Select one of the following available meals: \n"
        
        // Add available meals to message 
        meals.forEach((meal, i) => {
            msg += `${i + 1} ${meal.name} \n`
        })

        // Add exit options
        msg += 
            "\nSelect 0 to cancel order.\n" +
            "Select 00 to exit menu"


        socket.emit("bot:resp", msg)
        socket.emit("meals:data", meals)

    })

    // Get the current order and display it to the user
    socket.on("order:view", async () => {
        let msg

        // Get the current user session and populate the meals
        const session = await Session
            .findById(socket.sid)
            .populate("orders.order.meal") 
            .exec()

        // Grab the most recent order
        const order = session.orders.at(-1).order

        // If there are meals in the order display it
        if (!order.length) msg = "There are no meals in the current order."
        else {
            msg = "Here's you're current order:\n"
    
            // Add each order to the message
            order.forEach(obj => {
                msg += `${obj.meal.name} x${obj.qty}\n`
            })

        } 
        
        // Send the message to the user
        socket.emit("bot:resp", msg)
    })

    // Add meals to order
    socket.on("order:place", async (meal, callback) => {
        console.log("Order placed", meal)
        let msg
        if (meal === null) {
            // Get all meals in the database
            const meals = await Meal.find().lean().exec()

            msg = 
                "Sorry that's not a part of the valid options.\n" +
                "Select 0 to cancel order\n" + 
                "Select 00 to exit the order menu\n\n" +
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
                "Select 0 to cancel order"
            
            // Tell the client the order was successful
            callback(true)
        }
        socket.emit("bot:resp", msg)

    })

    // Cancel the current order
    socket.on("order:cancel", async () => {
        console.log("cancel order")
        let msg

        // Get the current session
        const session = await Session.findById(socket.sid).exec()

        // Grab the current order
        let order = session.orders.at(-1).order

        if (!order.length) msg = "You have nothing in your current order."
        else {
            // Empty the order
            session.orders.at(-1).order = []

            // Save changes to the database
            await session.save()

            msg = "Your order has been canceled successfully!"
        }
        
        socket.emit("bot:resp", msg)
    })

    // Exit the meal selecting menu
    socket.on("order:exitmenu", () => {
        socket.emit("bot:resp", "Menu exited")
    })

    // Checkout the current order
    socket.on("order:checkout", async () => {
        let msg
        
        // Load the user's session and populate the orders
        const session = await Session
            .findById(socket.sid)
            .populate("orders.order.meal")
            .exec()

        // Get the most recent order object
        const orderObj = session.orders.at(-1)

        // Only checkout when there is
        if (orderObj.order.length) {
            // Set the checkout date to now
            orderObj.checkoutAt = new Date()
            
            // Create a new empty order to be filled out
            session.orders.push({ order: [] })
            
            // Save the session
            await session.save()
            
            msg = "Order placed!\n\n" +
                "Select 1 to place a new order \n" +
                "Select 99 to checkout order \n" +
                "Select 98 to see order history \n" +
                "Select 97 to see current order \n" +
                "Select 0 to cancel order"
        }
        // If there's nothing in the order
        else { 
            msg = "No order to place.\n\n" +
                "Select 1 to place order \n" +
                "Select 99 to checkout order \n" +
                "Select 98 to see order history \n" +
                "Select 97 to see current order \n" +
                "Select 0 to cancel order"
        }

        // Send the message to the user
        socket.emit("bot:resp", msg)
    })

    // See the order history
    socket.on("order:history", async () => {
        let msg

        // Load the user's session and populate the orders
        const session = await Session
            .findById(socket.sid)
            .populate("orders.order.meal")
            .exec()


        if (session.orders.length > 1) {
            msg = "Here's your order history: \n\n"

            // Loop through the orders excluding the last one (it's empty)
            session.orders.slice(0,-1).forEach((orderObj, i) => {
                msg += `Order #${i + 1}\n\n`
            
                // Add the meals and get the total quantity
                let total = 0
                orderObj.order.forEach(ord => {
                    total += ord.qty
                    msg += `${ord.meal.name} x${ord.qty}\n`
                })

                // Format the checkout date
                const date = orderObj.checkoutAt.toLocaleString('en-US',
                    { dateStyle: 'medium', timeStyle: 'short' }
                )

                msg +=
                    `Total number of items: ${total} \n` +
                    `Order was checked out at ${date}\n\n`
            })
        } 
        else msg = "You haven't checked out any orders yet."

        socket.emit("bot:resp", msg)
    })

    // Send message when an invalid option is sent
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