const { model, Schema } = require("mongoose")

const mealSchema = new Schema({
    name: String,
    qty: {
        type: Number,
        default: 1,
        min: 1
    }
})


const Meal = model("Meal", mealSchema)

module.exports = Meal