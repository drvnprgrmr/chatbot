const { model, Schema } = require("mongoose")

const sessionSchema = new Schema({
    // Record order history
    orders: [{
        order: [{
            meal: {
                type: Schema.Types.ObjectId,
                ref: "Meal"
            },

            qty: {
                type: Number,
                min: 1,
                default: 1,
            }
        }],
        checkoutAt: {
            type: Date,
            default: Date.now,  
        }
    }]
})


const Session = model("Session", sessionSchema)

module.exports = Session