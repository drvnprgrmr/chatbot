const { model, Schema } = require("mongoose")

const Meal = require("./meals")

const sessionSchema = new Schema({
    // Record order history
    orders: [{
        meals: [Meal.schema],
        createdAt: {
            type: Date,
            default: Date.now,
            immutable: true
        }
    }]
})


const Session = model("Session", sessionSchema)

module.exports = Session