const socket = io()

const msgList = document.getElementById("msg-list")

const msgInp = document.getElementById("msg-inp")
const send = document.getElementById("send")

let awaitingOrder = false

const id = localStorage.getItem("sid")
console.log("id", id)
socket.emit("sid:get", id)
socket.on("sid:set", sid => localStorage.setItem("sid", sid))

send.addEventListener("click", ev => {
    ev.preventDefault()

    const msg = msgInp.value.trim()

    
    if (msg) {
        // Clear input
        msgInp.value = ""
        
        if (awaitingOrder) {
            socket.emit("order:place", msg)
            awaitingOrder = false
        }
        // Send message to server
        switch (msg) {
            case "0": {
                console.log("cancel order")
                break
            }

            case "1": {
                console.log("place order")
                socket.emit("meals:get")
                awaitingOrder = true
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

            default: {
                console.log("invalid option")
                socket.emit("invalid")
                break
            }
        }
        socket.emit("msg:post", opt)
    }

})

socket.on("bot:resp", msg => {
    const msgEl = document.createElement("li")
    msgEl.classList.add("msg", "bot")

    msgEl.innerText = msg
    msgList.appendChild(msgEl)
})