const msgList = document.getElementById("msg-list")

const msgInp = document.getElementById("msg-inp")
const form = document.getElementById("form")

let awaitingOrder = false
let meals


form.addEventListener("submit", async (ev) => {
    ev.preventDefault()

    // Get the option selected from the user
    const opt = msgInp.value.trim()

    // Only continue if there's a message
    if (!opt) return

    // Add message to list
    createMsg("usr", opt)

    // Clear input
    msgInp.value = ""
    
    if (opt === "0") {
        await getResp("/order/cancel", "POST")
    }

    else if (awaitingOrder) {
        if (opt === "00") {
            // Exit the menu
            awaitingOrder = false
            createMsg("bot", "Menu exited")
        } else {
            // Place an order on the meal with the right id
            const data = await getResp(`/order/place/${meals[opt - 1]}`, "POST")

            if (data.done) awaitingOrder = false
            // socket.emit("order:place", meals[opt - 1], (done) => {
            //     if (done) awaitingOrder = false
            // })
        }

    }

    else if (opt === "1") {
        // Get meals and move to the ordering menu
        const data = await getResp("/meals", "GET")
        awaitingOrder = true

        // Save the meal data gotten from the server
        meals = data.mealIds
    }
    // View the current order
    else if (opt === "97") {
        await getResp("/order/view", "GET")
    }

    // Get your order history
    else if (opt === "98") {
        await getResp("/order/history", "GET")
    }

    // Checkout your current order
    else if (opt === "99") {
        await getResp("/order/checkout", "POST")
    }

    // Get message for invalid option
    else {
        await getResp(`/invalid/${opt}`, "GET")
    }
    
})



async function getResp(route, method) {
    // Get response data
    const data = await fetch(route, {method}).then(res => res.json())

    // Create message from bot
    createMsg("bot", data.msg)

    // Return data
    return data
    
}

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



