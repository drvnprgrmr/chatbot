const { model, Schema } = require("mongoose")

const sessionSchema = new Schema({
    // Record order history
    orders: [{
        meals: [
            {
                type: Schema.Types.ObjectId,
                ref: "Meal"
            }
        ],
        createdAt: {
            type: Date,
            immutable: true
        }
    }]
})


const Session = model("Session", sessionSchema)

module.exports = Session