import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
    senderEmail: { type: String, required: true },
    receiverEmail: { type: String, required: true },
    amount: { type: Number, required: true },
    timestamp: { type: String, required: true }
});

const Transaction = mongoose.model('Transaction', transactionSchema);

export { Transaction };