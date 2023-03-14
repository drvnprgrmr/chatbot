require("dotenv").config()

const mongoose = require("mongoose")

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/hangout"

function connectDB() {
    mongoose.set("strictQuery", false)

    mongoose.connect(MONGODB_URI)

    mongoose.connection.on("connected", () => {
        console.log("Connected to MongoDB Successfully");
    });

    mongoose.connection.on("error", (err) => {
        console.log("An error occurred while connecting to MongoDB");
        console.log(err);
    });
}

module.exports = connectDB