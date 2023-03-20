const socket = io()

const msgList = document.getElementById("msg-list")

const msgInp = document.getElementById("msg-inp")
const form = document.getElementById("form")

let awaitingOrder = false
let meals

socket.on("connect", () => {
    // Send the current session id to the server if it exists
    socket.emit("sid:get", localStorage.getItem("sid"))

})
// Save the session id to local storage
socket.on("sid:set", sid => localStorage.setItem("sid", sid))

form.addEventListener("submit", ev => {
    ev.preventDefault()

    // Get the option selected from the user
    const opt = msgInp.value.trim()

    // Only continue if there's a message
    if (!opt) return

    // Add message to list
    createMsg("usr", opt)

    // Clear input
    msgInp.value = ""
    
    if (opt === "0") socket.emit("order:cancel")

    else if (awaitingOrder) {
        if (opt === "00") {
            // Exit the menu
            awaitingOrder = false
            socket.emit("order:exitmenu")
        } else {
            // Place an order on the meal with the right id
            socket.emit("order:place", meals[opt - 1], (done) => {
                if (done) awaitingOrder = false
            })
        }

    }

    else if (opt === "1") {
        // Get meals and move to the ordering menu
        socket.emit("meals:get")
        awaitingOrder = true
    }
    // View the current order
    else if (opt === "97") socket.emit("order:view")

    // Get your order history
    else if (opt === "98") socket.emit("order:history")

    // Checkout your current order
    else if (opt === "99") socket.emit("order:checkout")

    // Get message for invalid option
    else socket.emit("invalid", opt)
    

    

})

// Create a message for the bot
socket.on("bot:resp", msg => createMsg("bot", msg))


// Function to help create messages
function createMsg(usr, text) {
    // Create the list element
    const msgEl = document.createElement("li")
    
    // Add necessary classes
    msgEl.classList.add("msg", usr)

    // Add the message text
    msgEl.innerText = text

    // Add it to the list of messages
    msgList.appendChild(msgEl)

    // Scroll to the end
    msgList.scrollTop = msgList.scrollHeight

}

// Save the meal data gotten from the server
socket.on("meals:data", data => { meals = data })

