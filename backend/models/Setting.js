import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    value: {
        type: mongoose.Schema.Types.Mixed, // Can store numbers, strings, objects etc.
        required: true
    }
}, { timestamps: true });

const Setting = mongoose.model('Setting', settingSchema);

// Helper function to get or create the setting
Setting.getBonusCountdown = async function() {
    let setting = await this.findOne({ name: 'globalBonusCountdownPercent' });
    if (!setting) {
        // Initialize if it doesn't exist
        setting = await this.findOneAndUpdate(
            { name: 'globalBonusCountdownPercent' },
            { value: 100 }, // Starts at 100%
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
    }
    return setting.value;
};

Setting.decreaseBonusCountdown = async function(decreaseBy = 5) {
    const currentCountdown = await this.getBonusCountdown();
    let newValue = Math.max(0, currentCountdown - decreaseBy); // Ensure it doesn't go below 0
     await this.updateOne(
        { name: 'globalBonusCountdownPercent' },
        { value: newValue },
        { upsert: true } // Should not be needed if getBonusCountdown ensures creation
    );
    return newValue;
};

// Helper function to get or create the grand opening end date
Setting.getGrandOpeningEndDate = async function() {
    let setting = await this.findOne({ name: 'grandOpeningEndDate' });
    if (!setting) {
        // Initialize if it doesn't exist - set to 24 days from now
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 24);
        setting = await this.findOneAndUpdate(
            { name: 'grandOpeningEndDate' },
            { value: endDate.toISOString() },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
    }
    return new Date(setting.value);
};

// Helper function to get remaining days
Setting.getGrandOpeningRemainingDays = async function() {
    const endDate = await this.getGrandOpeningEndDate();
    const now = new Date();
    const diff = endDate - now;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

export default Setting;
