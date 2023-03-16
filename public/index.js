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

    const opt = msgInp.value.trim()
    console.log("opt", opt)

    // Only continue if there's a message
    if (!opt) return

    // Clear input
    msgInp.value = ""
    
    if (opt === "0") {
        console.log("cancel order")
        socket.emit("order:cancel")
    }

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
        console.log("place order")
        socket.emit("meals:get")
        awaitingOrder = true
    }
    else if (opt === "97") {
        console.log("see order")
        socket.emit("order:view")
    }
    else if (opt === "98") {
        console.log("see order history")
    }
    else if (opt === "99") {
        console.log("checkout order")
    }

    else {
        console.log("invalid option")
        socket.emit("invalid")
    }

    

})

socket.on("bot:resp", msg => {
    const msgEl = document.createElement("li")
    msgEl.classList.add("msg", "bot")

    msgEl.innerText = msg
    msgList.appendChild(msgEl)
})

socket.on("meals:data", data => {
    console.log("meal data", data)
    meals = data

})

