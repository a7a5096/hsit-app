// Script to run the MongoDB server locally for development
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const config = require('../config/config');

async function startDatabase() {
  console.log('Starting MongoDB memory server for development...');
  
  // Create an in-memory MongoDB instance
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  
  // Connect to the in-memory database
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  
  console.log(`MongoDB memory server running at: ${uri}`);
  console.log('Connected to in-memory database');
  
  // Return the server instance so it can be closed later
  return mongod;
}

// Export the function to be used in other files
module.exports = { startDatabase };

// If this script is run directly, start the database
if (require.main === module) {
  startDatabase()
    .then(() => {
      console.log('Database is ready for development');
      console.log('Press Ctrl+C to stop the database server');
    })
    .catch(err => {
      console.error('Failed to start database:', err);
      process.exit(1);
    });
}
