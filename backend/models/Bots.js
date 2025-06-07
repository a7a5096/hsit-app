import mongoose from 'mongoose';

// Schema for the individual features of a bot
const BotFeatureSchema = new mongoose.Schema({
    name: { type: String, required: true },   // e.g., "Strategy", "Risk Level"
    detail: { type: String, required: true }  // e.g., "Conservative", "Low"
}, { _id: false });

const BotSchema = new mongoose.Schema({
    botId: { // A unique string identifier for the bot, e.g., 'starterBot01'
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    investmentAmount: {
        type: Number,
        required: true
    },
    // Using String to allow for flexible descriptions like "1.2% Daily" or "10 UBT"
    dailyEarnings: {
        type: String,
        required: true
    },
    cycleDays: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    tagline: { // Optional short text displayed on the card
        type: String, 
        default: ''
    },
    purchaseLimit: { // The maximum number of this bot a single user can own
        type: Number,
        default: null // null means no limit
    },
    features: [BotFeatureSchema], // An array of features
    logoStyle: { // Optional CSS class for styling the logo on the product card
        type: String,
        default: 'logo-generic'
    }
}, {
    timestamps: true
});

const Bot = mongoose.model('Bot', BotSchema);

export default Bot;
