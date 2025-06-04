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

export default Setting;
