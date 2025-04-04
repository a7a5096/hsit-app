const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Validate that the environment variable exists
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not defined.');
    }

    // Connect using the environment variable directly
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // useNewUrlParser: true, // Optional: Mongoose 6+ handles this automatically
      // useUnifiedTopology: true // Optional: Mongoose 6+ handles this automatically
      // Add any other specific mongoose options here if needed
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`DB Connection Error: ${error.message}`);
    // In production, you might want more robust error handling than just exiting
    process.exit(1); // Exit process with failure
  }
};

module.exports = connectDB;