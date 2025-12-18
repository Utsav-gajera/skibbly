import mongoose from "mongoose";        



//function to connect to the mongodb database

const connectDB = async () => {
    mongoose.connection.on('connected', () => {
        console.log('MongoDB connected');
    });

    await mongoose.connect(`${process.env.MONGODB_URI}/job-portal`, {
        
    });
}
export default connectDB;