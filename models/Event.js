const mongoose = require('mongoose')

const eventSchema = mongoose.Schema({
    title: {
        type: String,
        required: [true, "Please add a title."]
    },
    body: {
        type: String,
        required: [true, "Please add a body."]
    },
    createdAt: {
        type: Date,
        default: Date.now()
    }
})

module.exports = mongoose.model('Event', eventSchema)