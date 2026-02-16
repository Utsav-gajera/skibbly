import mongoose from "mongoose";        



//function to connect to the mongodb database

const connectDB = async () => {
    mongoose.connection.on('connected', () => {
        console.log('MongoDB connected');
    });

    const baseUri = (process.env.MONGODB_URI || '').replace(/\/+$/, '');
    await mongoose.connect(`${baseUri}/skibbly`, {
      
    });
}
export default connectDB;