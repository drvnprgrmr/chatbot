const express = require("express")
const cookieParser = require("cookie-parser")
const path = require("path")

const connectDB = require("./connect-db")

const Meal = require("./models/meals")
const Session = require("./models/session")

const app = express()


app.use(express.static("public"))
app.use(cookieParser())


app.get("/", async (req, res) => {
    const sid = req.cookies.sid
    console.log("session", sid)
    
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
    }

    // Send the id to the client
    res.cookie("sid", session.id, { maxAge: 1073741824 })

    res.sendFile(path.join(__dirname, "views", "index.html"))
    console.log(session.id)
})



// Get the list of available meals
app.get("/meals", async (req, res) => {
    // Get all meals in the database
    const meals = await Meal.find().lean().exec()

    const mealIds = []

    let msg = "Select one of the following available meals: \n"
    
    // Add available meals to message 
    meals.forEach((meal, i) => {
        msg += `${i + 1} ${meal.name} \n`
        mealIds.push(meal._id)
    })

    // Add exit options
    msg += 
        "\nSelect 0 to cancel order.\n" +
        "Select 00 to exit menu"


    // Respond with message
    res.json({msg, mealIds})

})

// Get the current order and display it to the user
app.get("/order/view", async (req, res) => {
    const sid = req.cookies.sid

    let msg

    // Get the current user session and populate the meals
    const session = await Session
        .findById(sid)
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
    
    // Respond with message
    res.json({msg})
})

// Add meals to order
app.post("/order/place/:id", async (req, res) => {
    const sid = req.cookies.sid
    const meal = req.params.id

    let msg, done

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
        done = false
    } 
    else {
        // Get the current user session
        const session = await Session.findById(sid).exec()
        
        // Get the current order
        const order = session.orders.at(-1).order

        // Check if user has already ordered the meal
        const obj_ind = order.findIndex((obj) => obj.meal.equals(meal))

        // If the user has already ordered the meal
        // Increase the quantity
        if (obj_ind !== -1) order[obj_ind].qty++

        // Else create a new order
        else order.push({ meal })

        // Save changes to the session
        await session.save()

        msg = 
            "Your meal has been added successfully to the order.\n\n" +
            "Select 1 to add another meal \n" +
            "Select 99 to checkout order \n" +
            "Select 98 to see order history \n" +
            "Select 97 to see current order \n" +
            "Select 0 to cancel order"
        
        // Tell the client the order was successful
        done = true
    }

    // Respond with message
    res.send({ msg, done })
})

// Cancel the current order
app.post("/order/cancel", async (req, res) => {
    const sid = req.cookies.sid

    let msg

    // Get the current session
    const session = await Session.findById(sid).exec()

    // Grab the current order
    let order = session.orders.at(-1).order

    // If the user as items in the current order remove it
    if (!order.length) msg = "You have nothing in your current order."
    else {
        // Empty the order
        session.orders.at(-1).order = []

        // Save changes to the database
        await session.save()

        msg = "Your order has been canceled successfully!"
    }
    
    // Respond with message
    res.json({msg})
})


// Checkout the current order
app.post("/order/checkout", async (req, res) => {
    const sid = req.cookies.sid

    let msg
    
    // Load the user's session and populate the orders
    const session = await Session
        .findById(sid)
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

    // Respond with message
    res.json({msg})
})

// See the order history
app.get("/order/history", async (req, res) => {
    const sid = req.cookies.sid

    let msg

    // Load the user's session and populate the orders
    const session = await Session
        .findById(sid)
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

    // Respond with message
    res.json({msg})
})

// Send message when an invalid option is sent
app.get("/invalid/:opt", (req, res) => {
    const opt = req.params.opt

    let msg =
        `Sorry! The option you chose (${opt}) was invalid. \n` + 
        "Choose from one of the following:\n\n" +
        "Select 1 to place an order \n" +
        "Select 99 to checkout order \n" +
        "Select 98 to see order history \n" +
        "Select 97 to see current order \n" +
        "Select 0 to cancel order "

    // Respond with message
    res.json({msg})
})


app.use((req, res) => {
    res.status(404).send("Sorry, that route does not exist")
})

const port = process.env.PORT || 3000
app.listen(port, () => {
    console.log(`Server is listening on http://localhost:${port}`)
    connectDB()
})