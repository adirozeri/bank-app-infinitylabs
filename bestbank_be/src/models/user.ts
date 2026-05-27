import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, required: true },
    balance: { type: Number, required: true },
    isVerified: { type: Boolean, default: false }
});

const User = mongoose.model('User', userSchema);

export { User };