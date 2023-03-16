const { model, Schema } = require("mongoose")

const mealSchema = new Schema({
    name: {
        type: String,
        required: true
    }
})


const Meal = model("Meal", mealSchema)

module.exports = Meal