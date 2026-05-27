import { StateGraph, Annotation } from '@langchain/langgraph';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { Transaction } from '../models/transaction.js';
import { User } from '../models/user.js';

const GraphState = Annotation.Root({
    question:  Annotation<string>(),
    userEmail: Annotation<string>(),
    context:   Annotation<string>(),
    answer:    Annotation<string>(),
});

async function fetchData(state: typeof GraphState.State) {
    const [userDoc, txDocs] = await Promise.all([
        User.findOne({ email: state.userEmail }).select('email phone balance'),
        Transaction.find({
            $or: [{ senderEmail: state.userEmail }, { receiverEmail: state.userEmail }],
        }).sort({ timestamp: -1 }).limit(200),
    ]);

    if (!userDoc) return { context: '{"error":"Account not found"}' };

    const transactions = txDocs.map(t => ({
        counterpart: t.senderEmail === state.userEmail ? t.receiverEmail : t.senderEmail,
        amount:      t.senderEmail === state.userEmail ? -t.amount : t.amount,
        timestamp:   t.timestamp,
    }));

    return {
        context: JSON.stringify({
            account: { email: userDoc.email, phone: userDoc.phone, balance: userDoc.balance },
            transactions,
        }),
    };
}

let model: ChatGoogleGenerativeAI | null = null;

function getModel(): ChatGoogleGenerativeAI {
    if (!model) {
        model = new ChatGoogleGenerativeAI({
            model: 'gemini-2.5-flash',
            apiKey: process.env.GEMINI_API_KEY ?? '',
            generationConfig: { thinkingConfig: { thinkingBudget: 0 } },
        } as any);
    }
    return model;
}

async function generateAnswer(state: typeof GraphState.State) {
    const today = new Date().toISOString();

    const result = await getModel().invoke([
        new SystemMessage(`You are a helpful banking assistant for BestBank.
Today's date is ${today}.
Below is the complete account data for the current user in JSON. Use only this data to answer.
Negative amounts = money sent (outgoing). Positive amounts = money received (incoming).
Format money in USD with 2 decimal places. Be concise.

ACCOUNT DATA:
${state.context}`),
        new HumanMessage(state.question),
    ]);

    return {
        answer: typeof result.content === 'string' ? result.content : JSON.stringify(result.content),
    };
}

const graph = new StateGraph(GraphState)
    .addNode('fetchData', fetchData)
    .addNode('generateAnswer', generateAnswer)
    .addEdge('__start__', 'fetchData')
    .addEdge('fetchData', 'generateAnswer')
    .addEdge('generateAnswer', '__end__')
    .compile();

export async function runChatAgent(question: string, userEmail: string): Promise<string> {
    const result = await graph.invoke({ question, userEmail, context: '', answer: '' });
    return result.answer || 'I could not generate a response.';
}
